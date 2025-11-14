import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import * as XLSX from "xlsx";

/**
 * GET /api/components/[componentId]/records/export
 * Export records as CSV or Excel
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
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "csv"; // csv or xlsx

    // Verify component belongs to user
    const component = await prisma.component.findFirst({
      where: {
        id: componentId,
        userId,
      },
      include: {
        records: {
          orderBy: {
            createdAt: "desc",
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

    // Prepare data for export
    const exportData = component.records.map((record) => ({
      Name: record.name,
      Mobile: record.mobile,
      [component.occurrenceType === "MONTHLY" ? "EMI" : "Amount"]: record.emi,
      Date: record.date,
      "Created At": new Date(record.createdAt).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    }));

    if (exportData.length === 0) {
      return NextResponse.json(
        { error: "No records to export" },
        { status: 400 }
      );
    }

    const filename = `${component.name.replace(/\s+/g, "_")}_records_${new Date().toISOString().split("T")[0]}`;

    if (format === "xlsx") {
      // Create Excel file
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Records");

      // Generate buffer
      const buffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    } else {
      // Create CSV file
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error("Failed to export records:", error);
    return NextResponse.json(
      { error: "Failed to export records" },
      { status: 500 }
    );
  }
}
