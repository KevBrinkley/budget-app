import { NextResponse } from "next/server";
import { hasGoogleCredentials, getSpreadsheetTimezone } from "@/lib/env";
import { currentMonthKey, normalizeMonthKey } from "@/lib/month";
import { getTransactionsData } from "@/lib/transactions";
import { ensureTransactionsTab, resolveMonthKey } from "@/lib/transaction-months";

export async function GET(request: Request) {
  if (!hasGoogleCredentials()) {
    return NextResponse.json(
      { ok: false, error: "Google Sheets not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  let requested = searchParams.get("month")?.trim() || "";
  try {
    requested = requested
      ? normalizeMonthKey(requested)
      : currentMonthKey(getSpreadsheetTimezone());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid month" },
      { status: 400 },
    );
  }

  const category = searchParams.get("category")?.trim() || "";
  const subCategory = searchParams.get("sub")?.trim() || "";

  try {
    const tz = getSpreadsheetTimezone();
    if (requested === currentMonthKey(tz)) {
      await ensureTransactionsTab(requested);
    }
    const { monthKey } = await resolveMonthKey(requested);
    const result = await getTransactionsData(monthKey, { category, subCategory });
    return NextResponse.json(result, { status: result.ok ? 200 : 404 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load transactions" },
      { status: 500 },
    );
  }
}
