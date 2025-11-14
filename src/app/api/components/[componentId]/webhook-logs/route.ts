import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * GET /api/components/[componentId]/webhook-logs
 * List webhook logs for a specific component
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ componentId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { componentId } = await params;

    // Verify component belongs to user
    const component = await prisma.component.findFirst({
      where: {
        id: componentId,
        userId,
      },
    });

    if (!component) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get("status");

    // Build where clause
    const where: any = {
      componentId,
    };

    if (status) {
      where.status = status;
    }

    // Fetch logs
    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where,
        include: {
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
    console.error("Failed to fetch component webhook logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook logs" },
      { status: 500 }
    );
  }
}
