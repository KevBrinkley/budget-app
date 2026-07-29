import { NextResponse } from "next/server";
import { hasGoogleCredentials } from "@/lib/env";
import { getReferenceData } from "@/lib/reference";
import { writeRange } from "@/lib/sheets";

export async function PATCH(request: Request) {
  if (!hasGoogleCredentials()) {
    return NextResponse.json(
      { ok: false, error: "Google Sheets not configured." },
      { status: 503 },
    );
  }
  try {
    const { sheetRow, keywords } = await request.json();
    if (typeof sheetRow !== "number" || sheetRow < 2) {
      return NextResponse.json({ ok: false, error: "Invalid sheetRow" }, { status: 400 });
    }
    if (typeof keywords !== "string") {
      return NextResponse.json({ ok: false, error: "Invalid keywords" }, { status: 400 });
    }
    await writeRange(`Reference!C${sheetRow}`, [[keywords]]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  if (!hasGoogleCredentials()) {
    return NextResponse.json(
      { ok: false, error: "Google Sheets not configured. See budget-app/README.md." },
      { status: 503 },
    );
  }

  try {
    const data = await getReferenceData();
    if (data.rows.length === 0) {
      return NextResponse.json({
        ok: false,
        error: 'No Reference tab data found. Add a "Reference" sheet with categories from row 2.',
      });
    }
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load categories" },
      { status: 500 },
    );
  }
}
