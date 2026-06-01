import { getSpreadsheetMeta, getSheetsClient, writeRange } from "./sheets";
import { getSpreadsheetId } from "./env";
import { CORPORATE_TRAVEL_LABEL } from "./constants";

const TAB_RE = /^(\d{4}-\d{2}) Transactions$/;

/** Month keys from sheet tabs named "YYYY-MM Transactions", newest first. */
export async function listTransactionMonthKeys(): Promise<string[]> {
  const meta = await getSpreadsheetMeta();
  const titles =
    meta.sheets?.map((s) => s.properties?.title).filter(Boolean) ?? [];

  return titles
    .map((title) => {
      const m = String(title).match(TAB_RE);
      return m ? m[1] : null;
    })
    .filter((k): k is string => k != null)
    .sort()
    .reverse();
}

/** Use requested month if its tab exists; otherwise latest tab on or before that month. */
export async function resolveMonthKey(requested: string): Promise<{
  monthKey: string;
  fallback: boolean;
}> {
  const months = await listTransactionMonthKeys();
  if (months.includes(requested)) {
    return { monthKey: requested, fallback: false };
  }

  const prior = months.filter((m) => m <= requested);
  if (prior.length > 0) {
    return { monthKey: prior[0], fallback: true };
  }

  if (months.length > 0) {
    return { monthKey: months[0], fallback: true };
  }

  return { monthKey: requested, fallback: false };
}

export function transactionsTabName(monthKey: string): string {
  return `${monthKey} Transactions`;
}

export async function hasTransactionsTab(monthKey: string): Promise<boolean> {
  const months = await listTransactionMonthKeys();
  return months.includes(monthKey);
}

const TRANSACTION_TAB_HEADERS = [
  "Transaction",
  "Posted Date",
  "Card No.",
  "Description",
  "Category",
  "Debit",
  "Credit",
  "Category",
  "Sub-Category",
  "Manual",
  CORPORATE_TRAVEL_LABEL,
  "Plaid ID",
] as const;

/** Create the month tab with standard headers if it does not exist. Returns true if created. */
export async function ensureTransactionsTab(monthKey: string): Promise<boolean> {
  if (await hasTransactionsTab(monthKey)) return false;

  const name = transactionsTabName(monthKey);
  const sheets = getSheetsClient();
  const meta = await getSpreadsheetMeta();
  const sheetCount = meta.sheets?.length ?? 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title: name, index: sheetCount },
          },
        },
      ],
    },
  });

  await writeRange(`'${name}'!A1:L1`, [Array.from(TRANSACTION_TAB_HEADERS)]);
  return true;
}
