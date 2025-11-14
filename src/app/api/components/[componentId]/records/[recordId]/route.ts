import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { validateMobileNumber, validateMonthlyDate, validateYearlyDate } from "@/lib/utils";

const updateRecordSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  mobile: z.string().optional(),
  emi: z.number().min(0).optional(),
  date: z.string().optional(),
});

// GET single record
export async function GET(
  request: Request,
  { params }: { params: Promise<{ componentId: string; recordId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { componentId, recordId } = await params;

    const record = await prisma.record.findFirst({
      where: {
        id: recordId,
        componentId: componentId,
        component: {
          userId: session.user.id,
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to fetch record:", error);
    return NextResponse.json(
      { error: "Failed to fetch record" },
      { status: 500 }
    );
  }
}

// PATCH update record
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ componentId: string; recordId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { componentId, recordId } = await params;
    const body = await request.json();
    const validatedData = updateRecordSchema.parse(body);

    // Verify record exists and belongs to user's component
    const existingRecord = await prisma.record.findFirst({
      where: {
        id: recordId,
        componentId: componentId,
        component: {
          userId: session.user.id,
        },
      },
      include: {
        component: true,
      },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Validate mobile number if provided
    if (validatedData.mobile && !validateMobileNumber(validatedData.mobile)) {
      return NextResponse.json(
        { error: "Mobile number must start with 91 and be exactly 12 digits" },
        { status: 400 }
      );
    }

    // Validate date if provided
    if (validatedData.date) {
      if (existingRecord.component.occurrenceType === "MONTHLY") {
        const dateNum = parseInt(validatedData.date);
        if (isNaN(dateNum) || !validateMonthlyDate(dateNum)) {
          return NextResponse.json(
            { error: "For monthly components, date must be between 1 and 28" },
            { status: 400 }
          );
        }
      } else {
        if (!validateYearlyDate(validatedData.date)) {
          return NextResponse.json(
            { error: "For yearly components, date must be in DD/MM/YYYY format" },
            { status: 400 }
          );
        }
      }
    }

    // Update record
    const record = await prisma.record.update({
      where: { id: recordId },
      data: validatedData,
    });

    return NextResponse.json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Failed to update record:", error);
    return NextResponse.json(
      { error: "Failed to update record" },
      { status: 500 }
    );
  }
}

// DELETE record
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ componentId: string; recordId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { componentId, recordId } = await params;

    // Verify record exists and belongs to user's component
    const existingRecord = await prisma.record.findFirst({
      where: {
        id: recordId,
        componentId: componentId,
        component: {
          userId: session.user.id,
        },
      },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Delete record
    await prisma.record.delete({
      where: { id: recordId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete record:", error);
    return NextResponse.json(
      { error: "Failed to delete record" },
      { status: 500 }
    );
  }
}
