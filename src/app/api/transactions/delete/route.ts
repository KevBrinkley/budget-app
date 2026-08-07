import { NextResponse } from "next/server";
import { hasGoogleCredentials } from "@/lib/env";
import { normalizeMonthKey } from "@/lib/month";
import { deleteTransactionRow } from "@/lib/transactions";

export async function POST(request: Request) {
  if (!hasGoogleCredentials()) {
    return NextResponse.json({ ok: false, error: "Google Sheets not configured." }, { status: 503 });
  }

  let body: { monthKey?: string; sheetRow?: number; desc?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  let monthKey: string;
  try {
    monthKey = normalizeMonthKey(body.monthKey || "");
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid month" },
      { status: 400 },
    );
  }

  try {
    const result = await deleteTransactionRow(
      monthKey,
      Number(body.sheetRow),
      body.desc ?? "",
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 },
    );
  }
}
