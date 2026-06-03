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
