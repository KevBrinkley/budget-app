import { getSpreadsheetTimezone } from "./env";
import { formatMoney } from "./format";
import { formatShortDate, monthFromDate } from "./month";
import { getReferenceData } from "./reference";
import { readRange } from "./sheets";
import { annotateDuplicateAmounts } from "./duplicates";
import {
  isManualPlaceholder,
  reconcileManualTransactions,
} from "./manual-transactions";
import { hasTransactionsTab, transactionsTabName } from "./transaction-months";
import type { ApiResult, CategoryRef, InboxRow, ReconciledMatch } from "./types";

export async function getInboxData(monthKey: string): Promise<
  ApiResult<{
    monthKey: string;
    ref: CategoryRef;
    rows: InboxRow[];
    matched: ReconciledMatch[];
  }>
> {
  const tz = getSpreadsheetTimezone();
  const sheetName = transactionsTabName(monthKey);

  if (!(await hasTransactionsTab(monthKey))) {
    return {
      ok: false,
      error: `No tab named "${sheetName}". Create or import that month first.`,
    };
  }

  let values: unknown[][];
  try {
    values = await readRange(`'${sheetName}'!A2:L`);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : `Could not read "${sheetName}"`,
    };
  }

  // Absorb any manual placeholders whose real transaction has now posted. This
  // reuses the rows already read, so it costs nothing on the common path where
  // there is nothing to match; only an actual merge re-reads the tab.
  let matched: ReconciledMatch[] = [];
  try {
    matched = await reconcileManualTransactions(monthKey, values);
    if (matched.length > 0) {
      values = await readRange(`'${sheetName}'!A2:L`);
    }
  } catch {
    // Matching is best-effort — never block the inbox from rendering.
    matched = [];
  }

  const { ref } = await getReferenceData();
  const rows: InboxRow[] = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const posted = row[1];
    const desc = row[3] != null ? String(row[3]) : "";
    const debitCell = row[5];
    const creditCell = row[6];
    const subCol = row[8];

    if (monthFromDate(posted, tz) !== monthKey) continue;

    const debitNum =
      debitCell != null && debitCell !== "" ? Number(debitCell) : 0;
    if (!(debitNum > 0)) continue;

    const creditEmpty =
      creditCell == null || String(creditCell).trim() === "";
    if (!creditEmpty) continue;

    const subEmpty = subCol == null || String(subCol).trim() === "";
    if (!subEmpty) continue;

    rows.push({
      sheetRow: i + 2,
      amt: formatMoney(debitNum),
      amount: debitNum,
      date: formatShortDate(posted, tz),
      desc,
      manual: isManualPlaceholder(row[11]),
    });
  }

  return {
    ok: true,
    monthKey,
    ref,
    rows: annotateDuplicateAmounts(rows),
    matched,
  };
}
