/**
 * Pure matching rules for reconciling hand-entered placeholders against the
 * real transactions that later post. No sheet access — see
 * `manual-transactions.ts` for the side-effecting wrapper.
 */

/** How far apart a manual entry and a real posting may be and still match. */
export const MATCH_DAYS_BEFORE = 3; // bank posted slightly earlier than logged
export const MATCH_DAYS_AFTER = 14; // usual case: logged first, posts days later

export type MatchRow = {
  sheetRow: number;
  debit: number;
  creditEmpty: boolean;
  desc: string;
  /** Whole UTC days since epoch, or null when the date cell is unreadable. */
  days: number | null;
  category: string;
  subCategory: string;
  travel: string;
  manualPlaceholder: boolean;
};

export type MatchPlan = {
  placeholderRow: number;
  targetRow: number;
  desc: string;
  debit: number;
  matchedDesc: string;
  /** Category to copy onto the target, when it has none of its own. */
  applyCategory: { category: string; subCategory: string } | null;
  applyTravel: boolean;
};

/** Amounts are money — compare in whole cents, never as floats. */
export function cents(n: number): number {
  return Math.round(n * 100);
}

const spendable = (r: MatchRow) => r.debit > 0 && r.creditEmpty;

/**
 * Decide which placeholders can be absorbed into which imported rows.
 *
 * A placeholder merges only when exactly ONE imported row shares its amount
 * inside the date window. Zero means it has not posted yet; two or more means
 * the amount alone cannot identify it, so it is deliberately left for the
 * Inbox's duplicate-amount warning rather than guessed at.
 */
export function planManualMatches(rows: MatchRow[]): MatchPlan[] {
  const placeholders = rows.filter((r) => r.manualPlaceholder && spendable(r));
  if (placeholders.length === 0) return [];

  const imported = rows.filter((r) => !r.manualPlaceholder && spendable(r));
  if (imported.length === 0) return [];

  const consumed = new Set<number>();
  const plans: MatchPlan[] = [];

  for (const ph of placeholders) {
    const candidates = imported.filter((c) => {
      if (consumed.has(c.sheetRow)) return false;
      if (cents(c.debit) !== cents(ph.debit)) return false;
      if (ph.days == null || c.days == null) return true; // undated: amount alone
      const delta = c.days - ph.days;
      return delta >= -MATCH_DAYS_BEFORE && delta <= MATCH_DAYS_AFTER;
    });

    if (candidates.length !== 1) continue;

    const target = candidates[0];
    consumed.add(target.sheetRow);
    plans.push({
      placeholderRow: ph.sheetRow,
      targetRow: target.sheetRow,
      desc: ph.desc,
      debit: ph.debit,
      matchedDesc: target.desc,
      // Never clobber a category the import already resolved by keyword.
      applyCategory:
        ph.category && ph.subCategory && !target.subCategory
          ? { category: ph.category, subCategory: ph.subCategory }
          : null,
      applyTravel: Boolean(ph.travel) && !target.travel,
    });
  }

  return plans;
}
