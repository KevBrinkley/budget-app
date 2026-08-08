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
  /** Total Travel-category spend across the whole year (all month tabs). */
  travelYearTotal: number | null;
};

export type CategoryRef = Record<string, string[]>;

export type InboxRow = {
  sheetRow: number;
  amt: string;
  amount: number;
  date: string;
  desc: string;
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
