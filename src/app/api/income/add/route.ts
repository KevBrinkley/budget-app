import { NextResponse } from "next/server";
import { hasGoogleCredentials } from "@/lib/env";
import { normalizeMonthKey } from "@/lib/month";
import { addIncomeEntry } from "@/lib/income";

export async function POST(request: Request) {
  if (!hasGoogleCredentials()) {
    return NextResponse.json(
      { ok: false, error: "Google Sheets not configured." },
      { status: 503 },
    );
  }

  let body: { monthKey?: string; date?: string; source?: string; amount?: number };
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
    const result = await addIncomeEntry(monthKey, {
      date: body.date ?? "",
      source: body.source ?? "",
      amount: Number(body.amount),
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Add failed" },
      { status: 500 },
    );
  }
}
