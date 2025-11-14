import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { parse } from "papaparse";
import * as XLSX from "xlsx";
import { validateRecord } from "@/lib/utils";

interface ImportRow {
  name: string;
  mobile: string;
  emi: string;
  date: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: Array<{
    row: number;
    data: ImportRow;
    error: string;
  }>;
}

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

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    let rows: ImportRow[] = [];

    // Parse based on file type
    if (fileExtension === "csv") {
      const text = new TextDecoder().decode(buffer);
      const parseResult = parse<ImportRow>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
      });

      if (parseResult.errors.length > 0) {
        return NextResponse.json(
          {
            error: "Failed to parse CSV file",
            details: parseResult.errors,
          },
          { status: 400 }
        );
      }

      rows = parseResult.data;
    } else if (
      fileExtension === "xlsx" ||
      fileExtension === "xls" ||
      fileExtension === "xlsm"
    ) {
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });

      // Normalize keys to lowercase
      rows = jsonData.map((row: any) => ({
        name: row.name || row.Name || row.NAME || "",
        mobile: row.mobile || row.Mobile || row.MOBILE || "",
        emi: row.emi || row.Emi || row.EMI || row.amount || row.Amount || row.AMOUNT || "",
        date: row.date || row.Date || row.DATE || "",
      }));
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload CSV or Excel file." },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "File is empty" },
        { status: 400 }
      );
    }

    // Process rows and collect results
    const result: ImportResult = {
      success: true,
      totalRows: rows.length,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
    };

    const recordsToCreate: Array<{
      componentId: string;
      name: string;
      mobile: string;
      emi: number;
      date: string;
    }> = [];

    // Validate all rows first
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because: 1-indexed + header row

      try {
        // Trim all fields
        const name = row.name?.toString().trim() || "";
        const mobile = row.mobile?.toString().trim() || "";
        const emiStr = row.emi?.toString().trim() || "0";
        const date = row.date?.toString().trim() || "";

        // Validate fields
        if (!name) {
          throw new Error("Name is required");
        }

        if (!mobile) {
          throw new Error("Mobile is required");
        }

        if (!date) {
          throw new Error("Date is required");
        }

        // Parse EMI
        const emi = parseFloat(emiStr);
        if (isNaN(emi)) {
          throw new Error("EMI/Amount must be a valid number");
        }

        // Validate using existing utility
        const validation = validateRecord(
          name,
          mobile,
          emi,
          date,
          component.occurrenceType
        );

        if (!validation.isValid) {
          throw new Error(validation.errors.join(", "));
        }

        // Add to batch
        recordsToCreate.push({
          componentId,
          name: validation.data!.name,
          mobile: validation.data!.mobile,
          emi: validation.data!.emi,
          date: validation.data!.date,
        });
      } catch (error) {
        result.failedImports++;
        result.errors.push({
          row: rowNumber,
          data: row,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Bulk insert valid records
    if (recordsToCreate.length > 0) {
      try {
        await prisma.record.createMany({
          data: recordsToCreate,
          skipDuplicates: false,
        });
        result.successfulImports = recordsToCreate.length;
      } catch (error) {
        console.error("Bulk insert failed:", error);
        return NextResponse.json(
          {
            error: "Failed to insert records",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    // Set success based on whether all rows succeeded
    result.success = result.failedImports === 0;

    return NextResponse.json(result, { status: result.success ? 200 : 207 });
  } catch (error) {
    console.error("Bulk import failed:", error);
    return NextResponse.json(
      {
        error: "Failed to import records",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
