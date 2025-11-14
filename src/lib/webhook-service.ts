import { prisma } from "./prisma";
import { getUpcomingReminders } from "./reminder-utils";

interface WebhookPayload {
  recordId: string;
  name: string;
  mobile: string;
  emi: number;
  date: string;
  componentId: string;
  componentName: string;
  triggerId: string;
  scheduledAt: string;
  occurrenceType: "MONTHLY" | "YEARLY";
}

/**
 * Execute a webhook with retry mechanism
 */
async function executeWebhookWithRetry(
  url: string,
  payload: WebhookPayload,
  maxRetries: number = 3
): Promise<{
  success: boolean;
  httpStatusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  retryCount: number;
}> {
  let lastError: Error | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "BotPe-Reminders/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseText = await response.text();

      if (response.ok) {
        return {
          success: true,
          httpStatusCode: response.status,
          responseBody: responseText,
          retryCount: attempt,
        };
      } else {
        lastError = new Error(`HTTP ${response.status}: ${responseText}`);
        retryCount = attempt;

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retryCount = attempt;

      // Wait before retrying
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    errorMessage: lastError?.message || "Unknown error",
    retryCount,
  };
}

/**
 * Process a single reminder and execute its webhook
 */
async function processReminder(
  reminder: {
    recordId: string;
    componentId: string;
    triggerId: string;
    scheduledAt: Date;
  },
  record: any,
  component: any
): Promise<void> {
  // Check if webhook was already executed for this specific reminder
  const existingLog = await prisma.webhookLog.findFirst({
    where: {
      recordId: reminder.recordId,
      componentId: reminder.componentId,
      triggerId: reminder.triggerId,
      scheduledAt: reminder.scheduledAt,
      status: { in: ["SUCCESS", "PENDING"] },
    },
  });

  if (existingLog) {
    console.log(
      `Webhook already executed for record ${reminder.recordId} at ${reminder.scheduledAt}`
    );
    return;
  }

  // Prepare webhook payload
  const payload: WebhookPayload = {
    recordId: record.id,
    name: record.name,
    mobile: record.mobile,
    emi: record.emi,
    date: record.date,
    componentId: component.id,
    componentName: component.name,
    triggerId: reminder.triggerId,
    scheduledAt: reminder.scheduledAt.toISOString(),
    occurrenceType: component.occurrenceType,
  };

  console.log(`Executing webhook for record ${record.name} (${record.id})`);

  // Execute webhook
  const result = await executeWebhookWithRetry(component.webhookUrl, payload);

  // Create webhook log
  await prisma.webhookLog.create({
    data: {
      componentId: component.id,
      recordId: record.id,
      triggerId: reminder.triggerId,
      scheduledAt: reminder.scheduledAt,
      status: result.success ? "SUCCESS" : "FAILED",
      httpStatusCode: result.httpStatusCode,
      requestPayload: JSON.stringify(payload),
      responseBody: result.responseBody?.substring(0, 10000), // Limit to 10KB
      errorMessage: result.errorMessage?.substring(0, 1000), // Limit to 1KB
      retryCount: result.retryCount,
    },
  });

  if (result.success) {
    console.log(`Webhook executed successfully for record ${record.id}`);
  } else {
    console.error(
      `Webhook failed for record ${record.id}: ${result.errorMessage}`
    );
  }
}

/**
 * Process all pending reminders
 */
export async function processAllReminders(): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  console.log("Starting reminder processing...");

  try {
    // Get all active components with their triggers and records
    const components = await prisma.component.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        triggers: {
          where: {
            status: "ACTIVE",
          },
        },
        records: true,
      },
    });

    // Get upcoming reminders for the next 5 minutes
    // This ensures we catch reminders that are due now
    const reminders = getUpcomingReminders(
      components.map((c) => ({
        id: c.id,
        occurrenceType: c.occurrenceType,
        status: c.status,
        triggers: c.triggers.map((t) => ({
          id: t.id,
          offset: t.offset,
          direction: t.direction,
          time: t.time,
          status: t.status,
        })),
        records: c.records.map((r) => ({
          id: r.id,
          date: r.date,
          componentId: r.componentId,
        })),
      })),
      5 / (24 * 60) // 5 minutes in days
    );

    console.log(`Found ${reminders.length} reminders to process`);

    let processed = 0;
    let successful = 0;
    let failed = 0;

    // Process each reminder
    for (const reminder of reminders) {
      // Check if the reminder is due (within the last 5 minutes to now)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      if (
        reminder.scheduledAt > now ||
        reminder.scheduledAt < fiveMinutesAgo
      ) {
        continue; // Skip if not due yet or too old
      }

      // Find the component and record
      const component = components.find((c) => c.id === reminder.componentId);
      const record = component?.records.find(
        (r) => r.id === reminder.recordId
      );

      if (!component || !record) {
        console.error(
          `Component or record not found for reminder ${reminder.recordId}`
        );
        continue;
      }

      try {
        await processReminder(reminder, record, component);
        processed++;

        // Check if it was successful by looking at the latest log
        const latestLog = await prisma.webhookLog.findFirst({
          where: {
            recordId: reminder.recordId,
            triggerId: reminder.triggerId,
            scheduledAt: reminder.scheduledAt,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (latestLog?.status === "SUCCESS") {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error processing reminder ${reminder.recordId}:`, error);
        failed++;
      }
    }

    console.log(
      `Reminder processing complete: ${processed} processed, ${successful} successful, ${failed} failed`
    );

    return { processed, successful, failed };
  } catch (error) {
    console.error("Error in processAllReminders:", error);
    throw error;
  }
}
