const MONTH_RE = /^(\d{4})-(\d{1,2})$/;

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
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(String(value));
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
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(d);
}
