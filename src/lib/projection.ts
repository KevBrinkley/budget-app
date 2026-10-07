import { PROJECTED_CATEGORIES } from "./constants";
import type { SummaryLineRow } from "./types";

/**
 * End-of-month projection for one line.
 *
 * Committed categories in an open month are assumed to reach their full
 * budget, since the rest is already spoken for — that is the whole point of
 * the column. Everything else, and every line in a closed month, projects at
 * what has actually posted.
 */
export function projectLine(
  spend: number | null,
  budget: number | null,
  committed: boolean,
  monthIsOpen: boolean,
): number | null {
  if (!committed || !monthIsOpen) return spend;
  if (budget == null) return spend;
  if (spend == null) return budget;
  return Math.max(spend, budget);
}

export function isCommittedCategory(category: string): boolean {
  return PROJECTED_CATEGORIES.has(category.trim().toLowerCase());
}

/**
 * Attach `projection` to every category and sub-category row. A category's
 * committed flag applies to its sub-rows too, so an expanded Obligations shows
 * which individual bills still have money to come.
 */
export function annotateProjections(
  categories: SummaryLineRow[],
  monthIsOpen: boolean,
): SummaryLineRow[] {
  return categories.map((cat) => {
    const committed = !cat.isUncategorized && isCommittedCategory(cat.category);
    return {
      ...cat,
      projection: projectLine(cat.spend, cat.budget, committed, monthIsOpen),
      subs: cat.subs.map((sub) => ({
        ...sub,
        projection: projectLine(sub.spend, sub.budget, committed, monthIsOpen),
      })),
    };
  });
}

/** Sum of projections, ignoring rows that have none. Null when all are null. */
export function sumProjections(rows: SummaryLineRow[]): number | null {
  let total: number | null = null;
  for (const row of rows) {
    if (row.projection != null) total = (total ?? 0) + row.projection;
  }
  return total;
}
