import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get dashboard stats
    const [totalComponents, totalRecords, upcomingReminders, failedWebhooks] = await Promise.all([
      // Count total components for user
      prisma.component.count({
        where: { userId },
      }),

      // Count total records across all user's components
      prisma.record.count({
        where: {
          component: {
            userId,
          },
        },
      }),

      // Count upcoming reminders (next 7 days) - simplified for now
      0, // TODO: Implement actual upcoming reminders calculation

      // Count failed webhooks in last 24 hours
      prisma.webhookLog.count({
        where: {
          component: {
            userId,
          },
          status: "FAILED",
          executedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalComponents,
      totalRecords,
      upcomingReminders,
      failedWebhooks,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
