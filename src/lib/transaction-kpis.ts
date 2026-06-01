import type { TransactionRow } from "./types";

/** Categories excluded from NM/T (matches Summary tab formulas). */
const NMT_EXCLUDED = new Set(["Rent/Mortgage", "Travel"]);

export type ComputedTransactionKpis = {
  totalSpend: number;
  nmtSpend: number;
  uncategorizedSpend: number;
  uncategorizedCount: number;
};

export function computeTransactionKpis(rows: TransactionRow[]): ComputedTransactionKpis {
  let totalSpend = 0;
  let uncategorizedSpend = 0;
  let nmtSpend = 0;
  let uncategorizedCount = 0;

  for (const r of rows) {
    totalSpend += r.amount;
    const cat = r.category.trim();
    if (!cat) {
      uncategorizedSpend += r.amount;
      uncategorizedCount += 1;
    } else if (!NMT_EXCLUDED.has(cat)) {
      nmtSpend += r.amount;
    }
  }

  return { totalSpend, nmtSpend, uncategorizedSpend, uncategorizedCount };
}
