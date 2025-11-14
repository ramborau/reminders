import cron from "node-cron";
import { processAllReminders } from "./webhook-service";

let schedulerInstance: cron.ScheduledTask | null = null;

/**
 * Initialize the reminder processing scheduler
 * Runs every minute to check for pending reminders
 */
export function initializeScheduler() {
  // Prevent multiple instances
  if (schedulerInstance) {
    console.log("Scheduler already running");
    return;
  }

  // Run every minute
  schedulerInstance = cron.schedule("* * * * *", async () => {
    try {
      console.log(`[${new Date().toISOString()}] Running scheduled reminder processing...`);
      await processAllReminders();
    } catch (error) {
      console.error("Error in scheduled reminder processing:", error);
    }
  });

  console.log("Reminder scheduler initialized - running every minute");
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance = null;
    console.log("Reminder scheduler stopped");
  }
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return schedulerInstance !== null;
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    running: isSchedulerRunning(),
    schedule: "Every minute (* * * * *)",
  };
}
