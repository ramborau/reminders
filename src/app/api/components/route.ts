import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";

const createComponentSchema = z.object({
  name: z.string().min(1).max(100),
  occurrenceType: z.enum(["MONTHLY", "YEARLY"]),
  webhookUrl: z.string().url(),
  triggers: z.array(
    z.object({
      offset: z.number().int(),
      direction: z.enum(["BEFORE", "AFTER"]).nullable(),
      time: z.string(),
    })
  ).min(1),
});

// GET all components for the user
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const components = await prisma.component.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        triggers: true,
        _count: {
          select: {
            records: true,
            triggers: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(components);
  } catch (error) {
    console.error("Failed to fetch components:", error);
    return NextResponse.json(
      { error: "Failed to fetch components" },
      { status: 500 }
    );
  }
}

// POST create a new component
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createComponentSchema.parse(body);

    // Validate trigger offsets based on occurrence type
    for (const trigger of validatedData.triggers) {
      const maxOffset = validatedData.occurrenceType === "MONTHLY" ? 7 : 15;
      if (trigger.offset < 0 || trigger.offset > maxOffset) {
        return NextResponse.json(
          {
            error: `Invalid offset: ${trigger.offset}. Must be between 0 and ${maxOffset} for ${validatedData.occurrenceType} components`
          },
          { status: 400 }
        );
      }

      // Direction must be null when offset is 0
      if (trigger.offset === 0 && trigger.direction !== null) {
        return NextResponse.json(
          { error: "Direction must be null when offset is 0" },
          { status: 400 }
        );
      }

      // Direction must not be null when offset > 0
      if (trigger.offset > 0 && trigger.direction === null) {
        return NextResponse.json(
          { error: "Direction must be specified when offset > 0" },
          { status: 400 }
        );
      }
    }

    // Check if component name already exists for this user
    const existingComponent = await prisma.component.findFirst({
      where: {
        userId: session.user.id,
        name: validatedData.name,
      },
    });

    if (existingComponent) {
      return NextResponse.json(
        { error: "Component with this name already exists" },
        { status: 400 }
      );
    }

    // Create component with triggers
    const component = await prisma.component.create({
      data: {
        name: validatedData.name,
        occurrenceType: validatedData.occurrenceType,
        webhookUrl: validatedData.webhookUrl,
        userId: session.user.id,
        triggers: {
          create: validatedData.triggers,
        },
      },
      include: {
        triggers: true,
      },
    });

    return NextResponse.json(component, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Failed to create component:", error);
    return NextResponse.json(
      { error: "Failed to create component" },
      { status: 500 }
    );
  }
}
