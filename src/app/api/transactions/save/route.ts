import { NextResponse } from "next/server";
import { hasGoogleCredentials } from "@/lib/env";
import { normalizeMonthKey } from "@/lib/month";
import { saveTransactionRow } from "@/lib/transactions";

export async function POST(request: Request) {
  if (!hasGoogleCredentials()) {
    return NextResponse.json({ ok: false, error: "Google Sheets not configured." }, { status: 503 });
  }

  let body: {
    monthKey?: string;
    sheetRow?: number;
    category?: string;
    subCategory?: string;
    travel?: boolean;
  };

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
    const result = await saveTransactionRow(monthKey, Number(body.sheetRow), {
      category: body.category,
      subCategory: body.subCategory,
      travel: body.travel,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}
