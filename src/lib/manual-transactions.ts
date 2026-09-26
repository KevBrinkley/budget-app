import { getSpreadsheetTimezone } from "./env";
import { formatMoney } from "./format";
import { sheetDateToUtcDays } from "./month";
import { getReferenceData, isValidCategoryPair } from "./reference";
import { remapLegacyCategorySub } from "./legacy-map";
import { deleteRow, insertRowAt, readRange, writeRange } from "./sheets";
import { cents, planManualMatches, type MatchRow } from "./match-manual";
import { transactionsTabName } from "./transaction-months";
import type { ApiResult, ManualTransactionInput, ReconciledMatch } from "./types";

/**
 * Marker written to column L (Plaid ID) for rows the user typed in by hand.
 *
 * Column L is safe to borrow: the Apps Script Plaid import only reads it into a
 * Set of already-seen transaction ids, and a "MANUAL:" value can never equal a
 * real Plaid id — so a placeholder never suppresses an incoming transaction.
 */
export const MANUAL_ID_PREFIX = "MANUAL:";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isManualPlaceholder(colL: unknown): boolean {
  return String(colL ?? "").trim().toUpperCase().startsWith(MANUAL_ID_PREFIX);
}

/**
 * Insert a hand-entered transaction at the top of the month's tab (row 2), so
 * it sits above the most recent imported row rather than below everything.
 *
 * Leaving Category/Sub-Category blank is what puts it in the Inbox; passing a
 * category files it immediately and it still stays matchable.
 */
export async function addManualTransaction(
  monthKey: string,
  input: ManualTransactionInput,
): Promise<ApiResult<{ sheetRow: number }>> {
  const desc = (input.desc ?? "").trim();
  if (!desc) return { ok: false, error: "Enter a description" };

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero" };
  }

  const date = (input.date ?? "").trim();
  if (!ISO_DATE_RE.test(date)) {
    return { ok: false, error: "Enter a valid date" };
  }
  if (!date.startsWith(`${monthKey}-`)) {
    return { ok: false, error: `Pick a date inside ${monthKey}` };
  }

  const cat = (input.category ?? "").trim();
  const sub = (input.subCategory ?? "").trim();
  let mappedCat = "";
  let mappedSub = "";
  if (cat || sub) {
    if (!cat || !sub) {
      return { ok: false, error: "Pick category and subcategory" };
    }
    const { ref } = await getReferenceData();
    if (!isValidCategoryPair(ref, cat, sub)) {
      return { ok: false, error: "Invalid category and subcategory" };
    }
    [mappedCat, mappedSub] = remapLegacyCategorySub(cat, sub);
  }

  const id = `${MANUAL_ID_PREFIX}${date}-${cents(amount)}-${Math.abs(
    hashString(desc),
  ).toString(36)}`;

  // A..L — mirrors the shape the Plaid import writes.
  const row = [
    "", // A Transaction
    date, // B Posted Date
    "", // C Card No.
    desc, // D Description
    "", // E raw Category
    amount, // F Debit
    "", // G Credit
    mappedCat, // H Category
    mappedSub, // I Sub-Category
    mappedSub ? "MANUAL" : "", // J Manual
    input.travel ? "Yes" : "", // K Corporate Travel
    id, // L Plaid ID (manual marker)
  ];

  await insertRowAt(transactionsTabName(monthKey), 2, row);
  return { ok: true, sheetRow: 2 };
}

/** Stable, dependency-free hash so a placeholder id is deterministic. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function parseRows(values: unknown[][], tz: string): MatchRow[] {
  return values.map((row, i) => {
    const debitCell = row[5];
    const creditCell = row[6];
    return {
      sheetRow: i + 2,
      debit: debitCell != null && debitCell !== "" ? Number(debitCell) : 0,
      creditEmpty: creditCell == null || String(creditCell).trim() === "",
      desc: row[3] != null ? String(row[3]).trim() : "",
      days: sheetDateToUtcDays(row[1], tz),
      category: row[7] != null ? String(row[7]).trim() : "",
      subCategory: row[8] != null ? String(row[8]).trim() : "",
      travel: row[10] != null ? String(row[10]).trim() : "",
      manualPlaceholder: isManualPlaceholder(row[11]),
    };
  });
}

/**
 * Absorb manual placeholders into the real transactions that have since posted.
 *
 * A placeholder merges only when exactly ONE imported row in the month shares
 * its amount within the date window. Zero matches means it simply hasn't posted
 * yet; two or more means amount alone can't tell them apart, so it is left
 * alone for the Inbox's duplicate-amount warning to surface.
 *
 * Any category the user put on the placeholder is carried onto the real row,
 * then the placeholder is removed.
 *
 * @param values rows A2:L already read by the caller — no extra fetch.
 * @returns the merges performed; empty when nothing matched.
 */
export async function reconcileManualTransactions(
  monthKey: string,
  values: unknown[][],
): Promise<ReconciledMatch[]> {
  const tz = getSpreadsheetTimezone();
  const plans = planManualMatches(parseRows(values, tz));
  if (plans.length === 0) return [];

  const sheetName = transactionsTabName(monthKey);
  const writes: Promise<unknown>[] = [];

  for (const plan of plans) {
    if (plan.applyCategory) {
      writes.push(
        writeRange(`'${sheetName}'!H${plan.targetRow}:J${plan.targetRow}`, [
          [plan.applyCategory.category, plan.applyCategory.subCategory, "MANUAL"],
        ]),
      );
    }
    if (plan.applyTravel) {
      writes.push(writeRange(`'${sheetName}'!K${plan.targetRow}`, [["Yes"]]));
    }
  }

  // All writes use pre-delete indices, so they must land before any row shifts.
  await Promise.all(writes);

  // Delete bottom-up so removing one row never renumbers the next target, and
  // re-check the marker immediately before each delete. Row numbers came from a
  // separate read; refusing to delete anything that is not still a placeholder
  // means a stale index can never destroy a real transaction.
  const deleted = new Set<number>();
  const toDelete = plans.map((p) => p.placeholderRow).sort((a, b) => b - a);
  for (const rowNumber of toDelete) {
    const cell = await readRange(`'${sheetName}'!L${rowNumber}:L${rowNumber}`);
    if (!isManualPlaceholder(cell[0]?.[0])) continue;
    await deleteRow(sheetName, rowNumber);
    deleted.add(rowNumber);
  }

  return plans
    .filter((p) => deleted.has(p.placeholderRow))
    .map((p) => ({
      desc: p.desc,
      amt: formatMoney(p.debit),
      matchedDesc: p.matchedDesc,
    }));
}
