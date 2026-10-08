import { NextResponse } from "next/server";
import { hasGoogleCredentials, getSpreadsheetTimezone } from "@/lib/env";
import { currentMonthKey, normalizeMonthKey } from "@/lib/month";
import { getIncomeForMonth } from "@/lib/income";

export async function GET(request: Request) {
  if (!hasGoogleCredentials()) {
    return NextResponse.json(
      { ok: false, error: "Google Sheets not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const explicit = searchParams.get("month")?.trim() || "";
  let monthKey: string;
  try {
    monthKey = explicit
      ? normalizeMonthKey(explicit)
      : currentMonthKey(getSpreadsheetTimezone());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid month" },
      { status: 400 },
    );
  }

  try {
    const { rows, tabExists } = await getIncomeForMonth(monthKey);
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    return NextResponse.json({ ok: true, monthKey, rows, tabExists, total });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load income" },
      { status: 500 },
    );
  }
}
