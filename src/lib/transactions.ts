import { getSpreadsheetTimezone } from "./env";
import { formatMoney } from "./format";
import { formatShortDate, monthFromDate } from "./month";
import { getReferenceData, isValidCategoryPair } from "./reference";
import { deleteRow, readRange, writeRange } from "./sheets";
import { remapLegacyCategorySub } from "./legacy-map";
import { hasTransactionsTab, transactionsTabName } from "./transaction-months";
import type { ApiResult, CategoryRef, TransactionRow, TransactionSource } from "./types";

export function transactionSource(
  category: string,
  manual: string,
): TransactionSource {
  if (manual.trim().toUpperCase() === "MANUAL") return "manual";
  if (!category.trim()) return "uncategorized";
  return "keyword";
}

export async function getTransactionsData(
  monthKey: string,
  filters?: { category?: string; subCategory?: string },
): Promise<
  ApiResult<{
    monthKey: string;
    ref: CategoryRef;
    rows: TransactionRow[];
    totalSpend: number;
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

  const { ref } = await getReferenceData();
  const rows: TransactionRow[] = [];
  let totalSpend = 0;
  const catFilter = filters?.category?.trim() || "";
  const subFilter = filters?.subCategory?.trim() || "";

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const posted = row[1];
    const desc = row[3] != null ? String(row[3]) : "";
    const debitCell = row[5];
    const creditCell = row[6];
    const category = row[7] != null ? String(row[7]).trim() : "";
    const subCategory = row[8] != null ? String(row[8]).trim() : "";
    const manual = row[9] != null ? String(row[9]) : "";
    const travel = row[10] != null ? String(row[10]).trim() : "";

    if (monthFromDate(posted, tz) !== monthKey) continue;

    const debitNum =
      debitCell != null && debitCell !== "" ? Number(debitCell) : 0;
    if (!(debitNum > 0)) continue;

    const creditEmpty =
      creditCell == null || String(creditCell).trim() === "";
    if (!creditEmpty) continue;

    if (catFilter && category !== catFilter) continue;
    if (subFilter && subCategory !== subFilter) continue;

    totalSpend += debitNum;
    rows.push({
      sheetRow: i + 2,
      date: formatShortDate(posted, tz),
      desc,
      amt: formatMoney(debitNum),
      amount: debitNum,
      category,
      subCategory,
      source: transactionSource(category, manual),
      travel: travel.toLowerCase() === "yes",
    });
  }

  return { ok: true, monthKey, ref, rows, totalSpend };
}

export async function saveTransactionRow(
  monthKey: string,
  sheetRow: number,
  opts: {
    category?: string;
    subCategory?: string;
    travel?: boolean;
  },
): Promise<ApiResult<object>> {
  if (!Number.isInteger(sheetRow) || sheetRow < 2) {
    return { ok: false, error: "Invalid row" };
  }

  const sheetName = transactionsTabName(monthKey);
  const cat = (opts.category ?? "").trim();
  const sub = (opts.subCategory ?? "").trim();
  const writes: Promise<void>[] = [];

  if (cat || sub) {
    if (!cat || !sub) {
      return { ok: false, error: "Pick category and subcategory" };
    }
    const { ref } = await getReferenceData();
    if (!isValidCategoryPair(ref, cat, sub)) {
      return { ok: false, error: "Invalid category and subcategory" };
    }
    const [mappedCat, mappedSub] = remapLegacyCategorySub(cat, sub);
    writes.push(
      writeRange(`'${sheetName}'!H${sheetRow}:J${sheetRow}`, [
        [mappedCat, mappedSub, mappedSub ? "MANUAL" : ""],
      ]).then(() => undefined),
    );
  }

  if (opts.travel !== undefined) {
    writes.push(
      writeRange(`'${sheetName}'!K${sheetRow}`, [[opts.travel ? "Yes" : ""]]).then(
        () => undefined,
      ),
    );
  }

  if (writes.length === 0) {
    return { ok: false, error: "Nothing to save" };
  }

  await Promise.all(writes);
  return { ok: true };
}

/**
 * Delete a transaction row from the month's Transactions tab.
 * Guards against index drift by verifying the row's description still matches
 * what the client saw before removing it.
 */
export async function deleteTransactionRow(
  monthKey: string,
  sheetRow: number,
  expectedDesc: string,
): Promise<ApiResult<object>> {
  if (!Number.isInteger(sheetRow) || sheetRow < 2) {
    return { ok: false, error: "Invalid row" };
  }

  const sheetName = transactionsTabName(monthKey);
  let current: unknown[][];
  try {
    current = await readRange(`'${sheetName}'!D${sheetRow}:D${sheetRow}`);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read row" };
  }

  const actualDesc = current[0]?.[0] != null ? String(current[0][0]).trim() : "";
  if (actualDesc !== (expectedDesc ?? "").trim()) {
    return {
      ok: false,
      error: "This row changed since you loaded the page. Refresh and try again.",
    };
  }

  await deleteRow(sheetName, sheetRow);
  return { ok: true };
}
