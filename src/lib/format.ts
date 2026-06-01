export function formatMoney(n: number): string {
  const x = Number(n);
  if (Number.isNaN(x)) return "$0.00";
  return `$${x.toFixed(2)}`;
}

export function formatMoneyRounded(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function formatDelta(n: number | null | undefined): { text: string; cls: string } {
  if (n == null || Number.isNaN(n)) return { text: "—", cls: "flat" };
  if (Math.abs(n) < 0.005) return { text: "$0", cls: "flat" };
  const rounded = Math.round(n);
  if (rounded > 0) return { text: `$${rounded.toLocaleString("en-US")}`, cls: "up" };
  return { text: `($${Math.abs(rounded).toLocaleString("en-US")})`, cls: "dn" };
}

export function formatVsBudget(spend: number | null, budget: number | null): string {
  if (spend == null || budget == null) return "";
  const diff = spend - budget;
  return formatDelta(diff).text;
}
