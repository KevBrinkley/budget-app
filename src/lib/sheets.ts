import { google, sheets_v4 } from "googleapis";
import { getSpreadsheetId } from "./env";

let client: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (client) return client;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error(
      "Google credentials missing. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local",
    );
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  client = google.sheets({ version: "v4", auth });
  return client;
}

export async function getSpreadsheetMeta() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "properties.timeZone,sheets.properties.title",
  });
  return res.data;
}

export async function readRange(range: string): Promise<unknown[][]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range,
  });
  return (res.data.values as unknown[][]) || [];
}

/** Read computed values (not formulas) from the sheet. */
export async function readRangeValues(range: string): Promise<unknown[][]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  return (res.data.values as unknown[][]) || [];
}

export async function writeRange(range: string, values: unknown[][]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

/**
 * Tab title → numeric sheetId. Cached for the life of the process: ids are
 * stable for a given tab, and without this every structural edit pays for a
 * full spreadsheet metadata fetch (which adds up fast against the Sheets
 * per-minute quota when several rows are reconciled at once).
 */
const sheetIdCache = new Map<string, number>();

/** Resolve a tab title to its numeric sheetId (needed for structural edits). */
export async function getSheetIdByName(title: string): Promise<number | null> {
  const cached = sheetIdCache.get(title);
  if (cached != null) return cached;

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets.properties(sheetId,title)",
  });
  // Cache every tab we just paid to look up, not only the one asked for.
  for (const sheet of res.data.sheets || []) {
    const name = sheet.properties?.title;
    const id = sheet.properties?.sheetId;
    if (name && id != null) sheetIdCache.set(name, id);
  }
  return sheetIdCache.get(title) ?? null;
}

/** Delete a single 1-based row from a tab (shifts rows below up by one). */
export async function deleteRow(sheetName: string, rowNumber: number) {
  const sheetId = await getSheetIdByName(sheetName);
  if (sheetId == null) throw new Error(`Tab "${sheetName}" not found`);
  const sheets = getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1, // 0-based, inclusive
              endIndex: rowNumber, // exclusive
            },
          },
        },
      ],
    },
  });
}

/**
 * Insert a blank row at a 1-based position (shifts existing rows down by one),
 * then write `values` into it. Used to put manually-added transactions at the
 * top of the month's tab instead of appending them below the imported rows.
 */
export async function insertRowAt(
  sheetName: string,
  rowNumber: number,
  values: unknown[],
) {
  const sheetId = await getSheetIdByName(sheetName);
  if (sheetId == null) throw new Error(`Tab "${sheetName}" not found`);
  const sheets = getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1, // 0-based, inclusive
              endIndex: rowNumber, // exclusive
            },
            inheritFromBefore: false,
          },
        },
      ],
    },
  });
  const endCol = String.fromCharCode("A".charCodeAt(0) + values.length - 1);
  await writeRange(`'${sheetName}'!A${rowNumber}:${endCol}${rowNumber}`, [values]);
}

/** Append a row to the bottom of a tab's data. */
export async function appendRow(sheetName: string, values: unknown[]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `'${sheetName}'!A:Z`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

/** Create a tab if it does not exist. Returns true when one was created. */
export async function createSheetTabIfMissing(title: string): Promise<boolean> {
  if ((await getSheetIdByName(title)) != null) return false;
  const sheets = getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  });
  sheetIdCache.delete(title);
  return true;
}
