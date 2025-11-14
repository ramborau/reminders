import { NextRequest, NextResponse } from "next/server";
import { processAllReminders } from "@/lib/webhook-service";

/**
 * API endpoint to process pending reminders
 * This can be called by external cron services like Vercel Cron, GitHub Actions, etc.
 *
 * For security, you should:
 * 1. Add authentication (API key, secret token, etc.)
 * 2. Use Vercel Cron or similar service to trigger this endpoint
 *
 * Example with Vercel Cron (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-reminders",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication
    // const authHeader = request.headers.get("authorization");
    // const cronSecret = process.env.CRON_SECRET;
    // if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    console.log(`[${new Date().toISOString()}] Cron job triggered: process-reminders`);

    const result = await processAllReminders();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Error in process-reminders cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
