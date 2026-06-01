export function getSpreadsheetId(): string {
  const id = process.env.SPREADSHEET_ID?.trim();
  if (!id) throw new Error("SPREADSHEET_ID is not set");
  return id;
}

export function getSpreadsheetTimezone(): string {
  return process.env.SPREADSHEET_TIMEZONE?.trim() || "America/Denver";
}

export function hasGoogleCredentials(): boolean {
  return Boolean(
    process.env.SPREADSHEET_ID?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_PRIVATE_KEY?.trim(),
  );
}

export function getAppPassword(): string | undefined {
  const p = process.env.APP_PASSWORD?.trim();
  return p || undefined;
}
