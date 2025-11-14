import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";

const updateComponentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  webhookUrl: z.string().url().optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
});

// GET single component
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const component = await prisma.component.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        triggers: true,
        _count: {
          select: {
            records: true,
          },
        },
      },
    });

    if (!component) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(component);
  } catch (error) {
    console.error("Failed to fetch component:", error);
    return NextResponse.json(
      { error: "Failed to fetch component" },
      { status: 500 }
    );
  }
}

// PATCH update component
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateComponentSchema.parse(body);

    // Check if component exists and belongs to user
    const existingComponent = await prisma.component.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingComponent) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    // Update component
    const component = await prisma.component.update({
      where: {
        id: params.id,
      },
      data: validatedData,
      include: {
        triggers: true,
      },
    });

    return NextResponse.json(component);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Failed to update component:", error);
    return NextResponse.json(
      { error: "Failed to update component" },
      { status: 500 }
    );
  }
}

// DELETE component
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if component exists and belongs to user
    const existingComponent = await prisma.component.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingComponent) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    // Delete component (cascade delete will handle triggers, records, and logs)
    await prisma.component.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete component:", error);
    return NextResponse.json(
      { error: "Failed to delete component" },
      { status: 500 }
    );
  }
}
