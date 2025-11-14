import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";

const createTriggerSchema = z.object({
  offset: z.number().int().min(0),
  direction: z.enum(["BEFORE", "AFTER"]).nullable(),
  time: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i),
  status: z.enum(["ACTIVE", "PAUSED"]).optional().default("ACTIVE"),
});

/**
 * GET /api/components/[componentId]/triggers
 * List all triggers for a component
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

    const triggers = await prisma.trigger.findMany({
      where: {
        componentId,
      },
      orderBy: [
        { offset: "asc" },
        { time: "asc" },
      ],
    });

    return NextResponse.json({ triggers });
  } catch (error) {
    console.error("Failed to fetch triggers:", error);
    return NextResponse.json(
      { error: "Failed to fetch triggers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/components/[componentId]/triggers
 * Create a new trigger for a component
 */
export async function POST(
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
    const body = await request.json();

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

    // Validate request body
    const validatedData = createTriggerSchema.parse(body);

    // Validate offset based on occurrence type
    if (component.occurrenceType === "MONTHLY") {
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

    // Validate direction
    if (validatedData.offset === 0 && validatedData.direction !== null) {
      return NextResponse.json(
        { error: "Direction must be null when offset is 0" },
        { status: 400 }
      );
    }

    if (validatedData.offset > 0 && validatedData.direction === null) {
      return NextResponse.json(
        { error: "Direction is required when offset is greater than 0" },
        { status: 400 }
      );
    }

    // Create trigger
    const trigger = await prisma.trigger.create({
      data: {
        componentId,
        offset: validatedData.offset,
        direction: validatedData.direction,
        time: validatedData.time,
        status: validatedData.status,
      },
    });

    return NextResponse.json(trigger, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Failed to create trigger:", error);
    return NextResponse.json(
      { error: "Failed to create trigger" },
      { status: 500 }
    );
  }
}
