const MONTH_RE = /^(\d{4})-(\d{1,2})$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const US_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** Google Sheets date serial → UTC calendar date (date-only cells, no timezone shift). */
function sheetsSerialToUtcDate(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function monthKeyFromParts(y: number, mo: number): string {
  return `${y}-${String(mo).padStart(2, "0")}`;
}

export function normalizeMonthKey(input: string): string {
  const s = (input || "").trim();
  const m = s.match(MONTH_RE);
  if (!m) throw new Error(`Invalid month "${s}" — use YYYY-MM`);
  const y = m[1];
  const mo = parseInt(m[2], 10);
  if (mo < 1 || mo > 12) throw new Error(`Invalid month in key: ${s}`);
  return `${y}-${String(mo).padStart(2, "0")}`;
}

export function currentMonthKey(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const mo = parts.find((p) => p.type === "month")?.value;
  return `${y}-${mo}`;
}

export function bumpMonth(monthKey: string, delta: number): string {
  const [y, m] = normalizeMonthKey(monthKey).split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = normalizeMonthKey(monthKey).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function monthFromDate(value: unknown, timeZone: string): string {
  if (value == null || value === "") return "";

  if (typeof value === "number" && Number.isFinite(value)) {
    const d = sheetsSerialToUtcDate(value);
    return monthKeyFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1);
  }

  const s = String(value).trim();
  const iso = s.match(ISO_DATE_RE);
  if (iso) return `${iso[1]}-${iso[2]}`;

  const us = s.match(US_DATE_RE);
  if (us) return monthKeyFromParts(Number(us[3]), Number(us[1]));

  const d = value instanceof Date ? value : new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const mo = parts.find((p) => p.type === "month")?.value;
  return y && mo ? `${y}-${mo}` : "";
}

export function formatShortDate(value: unknown, timeZone: string): string {
  if (value == null || value === "") return "";

  const utcDateFmt = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
    }).format(d);

  if (typeof value === "number" && Number.isFinite(value)) {
    return utcDateFmt(sheetsSerialToUtcDate(value));
  }

  const s = String(value).trim();
  const iso = s.match(ISO_DATE_RE);
  if (iso) {
    return utcDateFmt(
      new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))),
    );
  }

  const us = s.match(US_DATE_RE);
  if (us) {
    return utcDateFmt(
      new Date(Date.UTC(Number(us[3]), Number(us[1]) - 1, Number(us[2]))),
    );
  }

  const d = value instanceof Date ? value : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(d);
}

const SERIAL_STRING_RE = /^\d+(\.\d+)?$/;
/** Sheets serials for 1954-01-01 .. 2119-01-01 — anything sane in a budget. */
const MIN_SHEET_SERIAL = 20000;
const MAX_SHEET_SERIAL = 80000;

/**
 * Parse any of the sheet's date encodings (serial number, ISO, US, Date) into
 * whole UTC days since epoch, or null when unparseable. Used to compare how
 * far apart two transactions posted without tripping over timezone shifts.
 */
export function sheetDateToUtcDays(value: unknown, timeZone: string): number | null {
  if (value == null || value === "") return null;
  const MS_PER_DAY = 86400000;

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(sheetsSerialToUtcDate(value).getTime() / MS_PER_DAY);
  }

  const s = String(value).trim();

  // A date cell with no date format comes back as a bare serial *string*.
  // Without this, `new Date("46291")` reads it as the year 46291 and the row
  // silently lands ~44,000 years in the future.
  if (SERIAL_STRING_RE.test(s)) {
    const n = Number(s);
    if (n >= MIN_SHEET_SERIAL && n <= MAX_SHEET_SERIAL) {
      return Math.floor(sheetsSerialToUtcDate(n).getTime() / MS_PER_DAY);
    }
  }

  const iso = s.match(ISO_DATE_RE);
  if (iso) {
    return Math.floor(
      Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) / MS_PER_DAY,
    );
  }

  const us = s.match(US_DATE_RE);
  if (us) {
    return Math.floor(
      Date.UTC(Number(us[3]), Number(us[1]) - 1, Number(us[2])) / MS_PER_DAY,
    );
  }

  const d = value instanceof Date ? value : new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  // Reduce to the calendar date as seen in the spreadsheet's timezone.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const mo = parts.find((p) => p.type === "month")?.value;
  const da = parts.find((p) => p.type === "day")?.value;
  if (!y || !mo || !da) return null;
  return Math.floor(Date.UTC(Number(y), Number(mo) - 1, Number(da)) / MS_PER_DAY);
}
