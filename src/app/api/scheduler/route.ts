import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  initializeScheduler,
  stopScheduler,
  getSchedulerStatus,
} from "@/lib/scheduler";

/**
 * Get scheduler status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = getSchedulerStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting scheduler status:", error);
    return NextResponse.json(
      { error: "Failed to get scheduler status" },
      { status: 500 }
    );
  }
}

/**
 * Control scheduler (start/stop)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === "start") {
      initializeScheduler();
      return NextResponse.json({
        success: true,
        message: "Scheduler started",
        status: getSchedulerStatus(),
      });
    } else if (action === "stop") {
      stopScheduler();
      return NextResponse.json({
        success: true,
        message: "Scheduler stopped",
        status: getSchedulerStatus(),
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'start' or 'stop'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error controlling scheduler:", error);
    return NextResponse.json(
      { error: "Failed to control scheduler" },
      { status: 500 }
    );
  }
}
