import { readRange } from "./sheets";
import type { CategoryRef, ReferenceData } from "./types";

function normalizeCell(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export async function getReferenceData(): Promise<ReferenceData> {
  let rows: unknown[][];
  try {
    rows = await readRange("Reference!A2:Z");
  } catch {
    return { ref: {}, structure: [], rows: [] };
  }

  const ref: CategoryRef = {};
  const structure: ReferenceData["structure"] = [];
  const flatRows: ReferenceData["rows"] = [];
  let lastCategory: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const category = normalizeCell(row[0]);
    const subCategory = normalizeCell(row[1]);
    const keywords = normalizeCell(row[2]);
    const budget = normalizeCell(row[3]);

    if (!category && !subCategory) continue;

    flatRows.push({
      sheetRow: i + 2, // Reference!A2 is index 0 → sheet row 2
      category,
      subCategory,
      keywords,
      budget,
    });

    if (category !== lastCategory) {
      structure.push({ category, subCategories: [subCategory] });
      lastCategory = category;
      ref[category] = [subCategory];
    } else {
      structure[structure.length - 1].subCategories.push(subCategory);
      ref[category].push(subCategory);
    }
  }

  return { ref, structure, rows: flatRows };
}

export function isValidCategoryPair(ref: CategoryRef, category: string, sub: string): boolean {
  const subs = ref[category];
  if (!subs) return false;
  return subs.includes(sub);
}
