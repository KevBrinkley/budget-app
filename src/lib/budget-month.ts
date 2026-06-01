import { normalizeMonthKey } from "./month";

export const BUDGET_MONTH_STORAGE_KEY = "budget-selected-month";

export function getStoredBudgetMonth(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(BUDGET_MONTH_STORAGE_KEY);
    return v ? normalizeMonthKey(v) : null;
  } catch {
    return null;
  }
}

export function setStoredBudgetMonth(monthKey: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(BUDGET_MONTH_STORAGE_KEY, normalizeMonthKey(monthKey));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Append or replace `month` on a path (preserves other query params on `path`). */
export function withBudgetMonth(path: string, monthKey: string): string {
  const [base, query] = path.split("?");
  const params = new URLSearchParams(query || "");
  params.set("month", normalizeMonthKey(monthKey));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
