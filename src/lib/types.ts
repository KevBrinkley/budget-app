export type TransactionSource = "keyword" | "manual" | "uncategorized";

export type TransactionRow = {
  sheetRow: number;
  date: string;
  desc: string;
  amt: string;
  amount: number;
  category: string;
  subCategory: string;
  source: TransactionSource;
  travel: boolean;
};

export type SummaryKpis = {
  totalSpend: number | null;
  totalBudget: number | null;
  wantSpend: number | null;
  wantBudget: number | null;
  uncategorizedSpend: number | null;
  uncategorizedBudget: number | null;
};

export type SummaryLineRow = {
  id: string;
  category: string;
  label: string;
  spend: number | null;
  budget: number | null;
  overUnder: number | null;
  subs: SummaryLineRow[];
  isUncategorized: boolean;
};

export type SummaryCategoryRow = SummaryLineRow;

export type SummaryData = {
  monthKey: string;
  kpis: SummaryKpis;
  categories: SummaryCategoryRow[];
  totalSpendForPct: number;
};

export type CategoryRef = Record<string, string[]>;

/**
 * Another uncategorized row in the same month sharing this row's exact amount.
 * Only populated when the descriptions differ — same amount from the same
 * merchant is not the ambiguous case worth warning about.
 */
export type DuplicateAmountInfo = {
  count: number;
  others: string[];
};

export type InboxRow = {
  sheetRow: number;
  amt: string;
  amount: number;
  date: string;
  desc: string;
  /** True for a placeholder the user typed in before the bank posted it. */
  manual?: boolean;
  duplicateAmount?: DuplicateAmountInfo;
};

export type ManualTransactionInput = {
  /** ISO date (YYYY-MM-DD) the purchase happened. */
  date: string;
  desc: string;
  amount: number;
  category?: string;
  subCategory?: string;
  travel?: boolean;
};

/** One manual placeholder absorbed into the imported row that matched it. */
export type ReconciledMatch = {
  desc: string;
  amt: string;
  matchedDesc: string;
};

export type ReferenceRow = {
  sheetRow: number;
  category: string;
  subCategory: string;
  keywords: string;
  budget: string;
};

export type ReferenceData = {
  ref: CategoryRef;
  structure: { category: string; subCategories: string[] }[];
  rows: ReferenceRow[];
};

export type ApiResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string };
