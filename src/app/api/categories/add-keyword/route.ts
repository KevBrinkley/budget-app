import { NextResponse } from "next/server";
import { hasGoogleCredentials } from "@/lib/env";
import { getReferenceData } from "@/lib/reference";
import { writeRange } from "@/lib/sheets";

export async function POST(request: Request) {
  if (!hasGoogleCredentials()) {
    return NextResponse.json(
      { ok: false, error: "Google Sheets not configured." },
      { status: 503 },
    );
  }
  try {
    const { keyword, category, subCategory } = await request.json();
    if (!keyword?.trim() || !category?.trim() || !subCategory?.trim()) {
      return NextResponse.json(
        { ok: false, error: "keyword, category, and subCategory are required" },
        { status: 400 },
      );
    }
    const { rows } = await getReferenceData();
    const match = rows.find(
      (r) => r.category === category.trim() && r.subCategory === subCategory.trim(),
    );
    if (!match) {
      return NextResponse.json(
        { ok: false, error: `No Reference row found for "${category} › ${subCategory}"` },
        { status: 404 },
      );
    }
    const existing = match.keywords
      ? match.keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : [];
    const kw = keyword.trim().toLowerCase();
    if (!existing.map((k) => k.toLowerCase()).includes(kw)) {
      existing.push(keyword.trim());
    }
    await writeRange(`Reference!C${match.sheetRow}`, [[existing.join(", ")]]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}
