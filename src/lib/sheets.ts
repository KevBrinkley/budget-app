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

/** Resolve a tab title to its numeric sheetId (needed for structural edits). */
export async function getSheetIdByName(title: string): Promise<number | null> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets.properties(sheetId,title)",
  });
  const match = (res.data.sheets || []).find((s) => s.properties?.title === title);
  return match?.properties?.sheetId ?? null;
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
