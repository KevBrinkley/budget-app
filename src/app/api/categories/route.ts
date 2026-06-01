import { NextResponse } from "next/server";
import { hasGoogleCredentials } from "@/lib/env";
import { getReferenceData } from "@/lib/reference";

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
