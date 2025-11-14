import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * GET /api/webhook-logs/stats
 * Get webhook execution statistics for the user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get statistics
    const [total, successful, failed, pending, recentLogs] = await Promise.all([
      // Total webhooks executed in period
      prisma.webhookLog.count({
        where: {
          component: { userId },
          executedAt: { gte: startDate },
        },
      }),

      // Successful webhooks
      prisma.webhookLog.count({
        where: {
          component: { userId },
          status: "SUCCESS",
          executedAt: { gte: startDate },
        },
      }),

      // Failed webhooks
      prisma.webhookLog.count({
        where: {
          component: { userId },
          status: "FAILED",
          executedAt: { gte: startDate },
        },
      }),

      // Pending webhooks
      prisma.webhookLog.count({
        where: {
          component: { userId },
          status: "PENDING",
          executedAt: { gte: startDate },
        },
      }),

      // Recent logs (last 10)
      prisma.webhookLog.findMany({
        where: {
          component: { userId },
        },
        include: {
          component: {
            select: {
              name: true,
            },
          },
          record: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          executedAt: "desc",
        },
        take: 10,
      }),
    ]);

    // Calculate success rate
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    // Group by date for chart data
    const dailyStats = await prisma.$queryRaw<
      Array<{ date: Date; status: string; count: bigint }>
    >`
      SELECT
        DATE(executed_at) as date,
        status,
        COUNT(*) as count
      FROM webhook_logs wl
      INNER JOIN components c ON wl.component_id = c.id
      WHERE c.user_id = ${userId}
        AND executed_at >= ${startDate}
      GROUP BY DATE(executed_at), status
      ORDER BY date ASC
    `;

    // Format daily stats
    const formattedDailyStats = dailyStats.map((stat) => ({
      date: stat.date,
      status: stat.status,
      count: Number(stat.count),
    }));

    return NextResponse.json({
      period: {
        days,
        startDate,
        endDate: new Date(),
      },
      summary: {
        total,
        successful,
        failed,
        pending,
        successRate: Math.round(successRate * 100) / 100,
      },
      dailyStats: formattedDailyStats,
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        componentName: log.component.name,
        recordName: log.record.name,
        status: log.status,
        executedAt: log.executedAt,
        httpStatusCode: log.httpStatusCode,
        errorMessage: log.errorMessage,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch webhook stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook statistics" },
      { status: 500 }
    );
  }
}
