import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { validateMobileNumber, validateMonthlyDate, validateYearlyDate } from "@/lib/utils";

const createRecordSchema = z.object({
  name: z.string().min(1).max(100),
  mobile: z.string(),
  emi: z.number().min(0),
  date: z.string(),
});

// GET all records for a component
export async function GET(
  request: Request,
  { params }: { params: { componentId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";

    // Verify component belongs to user
    const component = await prisma.component.findUnique({
      where: {
        id: params.componentId,
        userId: session.user.id,
      },
    });

    if (!component) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    const where = {
      componentId: params.componentId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { mobile: { contains: search } },
        ],
      }),
    };

    const [records, total] = await Promise.all([
      prisma.record.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.record.count({ where }),
    ]);

    return NextResponse.json({
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch records:", error);
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 }
    );
  }
}

// POST create a new record
export async function POST(
  request: Request,
  { params }: { params: { componentId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createRecordSchema.parse(body);

    // Verify component belongs to user
    const component = await prisma.component.findUnique({
      where: {
        id: params.componentId,
        userId: session.user.id,
      },
    });

    if (!component) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    // Validate mobile number
    if (!validateMobileNumber(validatedData.mobile)) {
      return NextResponse.json(
        { error: "Mobile number must start with 91 and be exactly 12 digits" },
        { status: 400 }
      );
    }

    // Validate date based on component type
    if (component.occurrenceType === "MONTHLY") {
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

    // Create record
    const record = await prisma.record.create({
      data: {
        ...validatedData,
        componentId: params.componentId,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Failed to create record:", error);
    return NextResponse.json(
      { error: "Failed to create record" },
      { status: 500 }
    );
  }
}
