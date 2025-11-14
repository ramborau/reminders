import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * GET /api/webhook-logs
 * List all webhook logs for the authenticated user with pagination and filters
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

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get("status"); // SUCCESS, FAILED, PENDING
    const componentId = searchParams.get("componentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: any = {
      component: {
        userId,
      },
    };

    if (status) {
      where.status = status;
    }

    if (componentId) {
      where.componentId = componentId;
    }

    if (startDate || endDate) {
      where.executedAt = {};
      if (startDate) {
        where.executedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.executedAt.lte = new Date(endDate);
      }
    }

    // Fetch logs
    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where,
        include: {
          component: {
            select: {
              id: true,
              name: true,
              occurrenceType: true,
            },
          },
          record: {
            select: {
              id: true,
              name: true,
              mobile: true,
            },
          },
          trigger: {
            select: {
              id: true,
              offset: true,
              direction: true,
              time: true,
            },
          },
        },
        orderBy: {
          executedAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.webhookLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch webhook logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook logs" },
      { status: 500 }
    );
  }
}
