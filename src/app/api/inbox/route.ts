import { NextResponse } from "next/server";
import { hasGoogleCredentials } from "@/lib/env";
import { getInboxData } from "@/lib/inbox";
import { currentMonthKey, normalizeMonthKey } from "@/lib/month";
import { getSpreadsheetTimezone } from "@/lib/env";
import { resolveMonthKey, ensureTransactionsTab } from "@/lib/transaction-months";

export async function GET(request: Request) {
  if (!hasGoogleCredentials()) {
    return NextResponse.json(
      { ok: false, error: "Google Sheets not configured. See budget-app/README.md." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const explicitMonth = searchParams.get("month")?.trim() || "";
  let requested: string;
  try {
    requested = explicitMonth
      ? normalizeMonthKey(explicitMonth)
      : currentMonthKey(getSpreadsheetTimezone());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid month" },
      { status: 400 },
    );
  }

  try {
    const tz = getSpreadsheetTimezone();
    const calendarMonth = currentMonthKey(tz);
    if (requested === calendarMonth) {
      await ensureTransactionsTab(calendarMonth);
    }

    const { monthKey, fallback } = await resolveMonthKey(requested);
    const result = await getInboxData(monthKey);
    if (!result.ok) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json({
      ...result,
      requestedMonth: requested,
      fallback,
      notice: fallback
        ? `Showing ${monthKey} — no "${requested} Transactions" tab yet. Use ‹ › to change month.`
        : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load inbox" },
      { status: 500 },
    );
  }
}
