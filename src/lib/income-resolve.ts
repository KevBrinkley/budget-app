import { DEFAULT_MONTHLY_INCOME, INCOME_OVERRIDE_THRESHOLD } from "./constants";

export type ResolvedIncome = {
  /** The figure to show. */
  income: number;
  /** What actually got logged, for display alongside. */
  logged: number | null;
  /** Whether `income` came from logged entries or the default. */
  source: "logged" | "default";
};

/**
 * Decide the month's income figure from what has been logged.
 *
 * - Nothing logged → the default. There is no better guess.
 * - Open month, logged total still short of a full month → the default, since
 *   the remaining cheque has not landed yet. Showing one paycheque would
 *   understate income and so understate projected savings.
 * - Open month, logged total in the ballpark (or above, e.g. a bonus) → the
 *   logged total. It is the real number and need not match the default
 *   exactly.
 * - Closed month → always the logged total. Nothing more is coming, so a
 *   short month is a fact rather than an incomplete record.
 */
export function resolveMonthIncome(
  logged: number | null,
  monthIsOpen: boolean,
  defaultIncome: number = DEFAULT_MONTHLY_INCOME,
  threshold: number = INCOME_OVERRIDE_THRESHOLD,
): ResolvedIncome {
  if (logged == null || logged <= 0) {
    return { income: defaultIncome, logged: null, source: "default" };
  }
  if (!monthIsOpen) {
    return { income: logged, logged, source: "logged" };
  }
  if (logged >= defaultIncome * threshold) {
    return { income: logged, logged, source: "logged" };
  }
  return { income: defaultIncome, logged, source: "default" };
}
