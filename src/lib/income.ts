import { getSpreadsheetTimezone } from "./env";
import { formatMoney } from "./format";
import { formatShortDate, monthFromDate } from "./month";
import {
  appendRow,
  createSheetTabIfMissing,
  deleteRow,
  getSheetIdByName,
  readRange,
  writeRange,
} from "./sheets";
import type { ApiResult, IncomeRow } from "./types";

/**
 * Income lives in its own tab, not in column G of the month's Transactions tab.
 *
 * That is deliberate: `categorizeTransactionsOnSheet_` in the Apps Script
 * DELETES every row with a populated Credit (column G) at the start of each
 * run, so anything recorded there would vanish on the next categorize. A
 * separate tab is untouched by that script.
 */
export const INCOME_TAB = "Income";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Create the Income tab with headers the first time it is needed. */
export async function ensureIncomeTab(): Promise<void> {
  const created = await createSheetTabIfMissing(INCOME_TAB);
  if (created) {
    await writeRange(`'${INCOME_TAB}'!A1:C1`, [["Date", "Source", "Amount"]]);
  }
}

export async function incomeTabExists(): Promise<boolean> {
  return (await getSheetIdByName(INCOME_TAB)) != null;
}

/**
 * Income entries for one month, newest first.
 *
 * Returns an empty list (not an error) when the tab does not exist yet — no
 * income has been logged, which is a valid state rather than a failure.
 */
export async function getIncomeForMonth(
  monthKey: string,
): Promise<{ rows: IncomeRow[]; tabExists: boolean }> {
  if (!(await incomeTabExists())) return { rows: [], tabExists: false };

  const tz = getSpreadsheetTimezone();
  let values: unknown[][];
  try {
    values = await readRange(`'${INCOME_TAB}'!A2:C`);
  } catch {
    return { rows: [], tabExists: true };
  }

  const rows: IncomeRow[] = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rawDate = row[0];
    const source = row[1] != null ? String(row[1]).trim() : "";
    const amountCell = row[2];
    if (rawDate == null || rawDate === "") continue;
    if (monthFromDate(rawDate, tz) !== monthKey) continue;

    const amount =
      amountCell != null && amountCell !== "" ? Number(amountCell) : 0;
    if (!Number.isFinite(amount) || amount === 0) continue;

    rows.push({
      sheetRow: i + 2,
      date: String(rawDate),
      dateLabel: formatShortDate(rawDate, tz),
      source,
      amount,
      amt: formatMoney(amount),
    });
  }

  rows.sort((a, b) => b.sheetRow - a.sheetRow);
  return { rows, tabExists: true };
}

/** Total logged income for a month, or null when nothing has been logged. */
export async function getIncomeTotal(monthKey: string): Promise<number | null> {
  const { rows, tabExists } = await getIncomeForMonth(monthKey);
  if (!tabExists) return null;
  if (rows.length === 0) return null;
  return rows.reduce((sum, r) => sum + r.amount, 0);
}

export async function addIncomeEntry(
  monthKey: string,
  input: { date: string; source: string; amount: number },
): Promise<ApiResult<object>> {
  const source = (input.source ?? "").trim();
  if (!source) return { ok: false, error: "Enter a source" };

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero" };
  }

  const date = (input.date ?? "").trim();
  if (!ISO_DATE_RE.test(date)) return { ok: false, error: "Enter a valid date" };
  if (!date.startsWith(`${monthKey}-`)) {
    return { ok: false, error: `Pick a date inside ${monthKey}` };
  }

  await ensureIncomeTab();
  await appendRow(INCOME_TAB, [date, source, amount]);
  return { ok: true };
}

/**
 * Delete an income entry, verifying the row still holds the source the client
 * saw so a stale index cannot remove someone else's row.
 */
export async function deleteIncomeEntry(
  sheetRow: number,
  expectedSource: string,
): Promise<ApiResult<object>> {
  if (!Number.isInteger(sheetRow) || sheetRow < 2) {
    return { ok: false, error: "Invalid row" };
  }
  if (!(await incomeTabExists())) {
    return { ok: false, error: "No income recorded yet" };
  }

  let current: unknown[][];
  try {
    current = await readRange(`'${INCOME_TAB}'!B${sheetRow}:B${sheetRow}`);
  } catch {
    return { ok: false, error: "Could not read that row" };
  }

  const actual = current[0]?.[0] != null ? String(current[0][0]).trim() : "";
  if (actual !== (expectedSource ?? "").trim()) {
    return {
      ok: false,
      error: "This row changed since you loaded the page. Refresh and try again.",
    };
  }

  await deleteRow(INCOME_TAB, sheetRow);
  return { ok: true };
}
