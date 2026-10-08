import { NextResponse } from "next/server";
import { hasGoogleCredentials } from "@/lib/env";
import { deleteIncomeEntry } from "@/lib/income";

export async function POST(request: Request) {
  if (!hasGoogleCredentials()) {
    return NextResponse.json(
      { ok: false, error: "Google Sheets not configured." },
      { status: 503 },
    );
  }

  let body: { sheetRow?: number; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await deleteIncomeEntry(Number(body.sheetRow), body.source ?? "");
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 },
    );
  }
}
