import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";

const updateTriggerSchema = z.object({
  offset: z.number().int().min(0).optional(),
  direction: z.enum(["BEFORE", "AFTER"]).nullable().optional(),
  time: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i).optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
});

/**
 * GET /api/components/[componentId]/triggers/[triggerId]
 * Get a single trigger
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ componentId: string; triggerId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { componentId, triggerId } = await params;

    // Verify trigger exists and belongs to user's component
    const trigger = await prisma.trigger.findFirst({
      where: {
        id: triggerId,
        componentId,
        component: {
          userId,
        },
      },
      include: {
        component: {
          select: {
            id: true,
            name: true,
            occurrenceType: true,
          },
        },
      },
    });

    if (!trigger) {
      return NextResponse.json(
        { error: "Trigger not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(trigger);
  } catch (error) {
    console.error("Failed to fetch trigger:", error);
    return NextResponse.json(
      { error: "Failed to fetch trigger" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/components/[componentId]/triggers/[triggerId]
 * Update a trigger
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ componentId: string; triggerId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { componentId, triggerId } = await params;
    const body = await request.json();

    // Verify trigger exists and belongs to user's component
    const existingTrigger = await prisma.trigger.findFirst({
      where: {
        id: triggerId,
        componentId,
        component: {
          userId,
        },
      },
      include: {
        component: true,
      },
    });

    if (!existingTrigger) {
      return NextResponse.json(
        { error: "Trigger not found" },
        { status: 404 }
      );
    }

    // Validate request body
    const validatedData = updateTriggerSchema.parse(body);

    // Validate offset based on occurrence type if provided
    if (validatedData.offset !== undefined) {
      if (existingTrigger.component.occurrenceType === "MONTHLY") {
        if (validatedData.offset > 7) {
          return NextResponse.json(
            { error: "For monthly components, offset must be between 0 and 7" },
            { status: 400 }
          );
        }
      } else {
        // YEARLY
        if (validatedData.offset > 15) {
          return NextResponse.json(
            { error: "For yearly components, offset must be between 0 and 15" },
            { status: 400 }
          );
        }
      }
    }

    // Validate direction consistency
    const finalOffset = validatedData.offset ?? existingTrigger.offset;
    const finalDirection = validatedData.direction !== undefined
      ? validatedData.direction
      : existingTrigger.direction;

    if (finalOffset === 0 && finalDirection !== null) {
      return NextResponse.json(
        { error: "Direction must be null when offset is 0" },
        { status: 400 }
      );
    }

    if (finalOffset > 0 && finalDirection === null) {
      return NextResponse.json(
        { error: "Direction is required when offset is greater than 0" },
        { status: 400 }
      );
    }

    // Update trigger
    const trigger = await prisma.trigger.update({
      where: { id: triggerId },
      data: validatedData,
    });

    return NextResponse.json(trigger);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Failed to update trigger:", error);
    return NextResponse.json(
      { error: "Failed to update trigger" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/components/[componentId]/triggers/[triggerId]
 * Delete a trigger
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ componentId: string; triggerId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { componentId, triggerId } = await params;

    // Verify trigger exists and belongs to user's component
    const existingTrigger = await prisma.trigger.findFirst({
      where: {
        id: triggerId,
        componentId,
        component: {
          userId,
        },
      },
    });

    if (!existingTrigger) {
      return NextResponse.json(
        { error: "Trigger not found" },
        { status: 404 }
      );
    }

    // Delete trigger
    await prisma.trigger.delete({
      where: { id: triggerId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete trigger:", error);
    return NextResponse.json(
      { error: "Failed to delete trigger" },
      { status: 500 }
    );
  }
}
