import { readRangeValues } from "./sheets";
import { hasTransactionsTab, transactionsTabName } from "./transaction-months";
import { WANT_CATEGORIES, TRAVEL_CATEGORY } from "./constants";
import { getSpreadsheetTimezone } from "./env";
import { currentMonthKey } from "./month";
import { annotateProjections, sumProjections } from "./projection";
import type { ApiResult, SummaryCategoryRow, SummaryData, SummaryKpis } from "./types";

function cellStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function cellNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function slugCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getSummaryData(monthKey: string): Promise<ApiResult<SummaryData>> {
  const summaryName = `${monthKey} Summary`;
  const hasTrans = await hasTransactionsTab(monthKey);

  let values: unknown[][];
  try {
    values = await readRangeValues(`'${summaryName}'!A1:E250`);
  } catch {
    if (!hasTrans) {
      return {
        ok: false,
        error: `No "${summaryName}" tab. Run categorize for ${monthKey} in Apps Script first.`,
      };
    }
    return {
      ok: false,
      error: `No "${summaryName}" tab yet. Run categorizeTransactionsForMonth("${monthKey}") in Apps Script.`,
    };
  }

  const kpis: SummaryKpis = {
    totalSpend: null,
    totalBudget: null,
    wantSpend: null,
    wantBudget: null,
    uncategorizedSpend: null,
    uncategorizedBudget: null,
  };

  for (const row of values) {
    const label = cellStr(row[0]);
    if (label === "Total") {
      kpis.totalSpend = cellNum(row[2]);
      kpis.totalBudget = cellNum(row[3]);
    } else if (label === "Uncategorized") {
      kpis.uncategorizedSpend = cellNum(row[2]);
      kpis.uncategorizedBudget = cellNum(row[3]);
    }
  }

  let inBreakdown = false;
  const categories: SummaryCategoryRow[] = [];
  let currentCat: SummaryCategoryRow | null = null;
  let totalSpendForPct = kpis.totalSpend ?? 0;

  for (const row of values) {
    const a = cellStr(row[0]);
    const b = cellStr(row[1]);

    if (a === "Category Breakdowns") {
      inBreakdown = true;
      continue;
    }
    if (!inBreakdown) continue;
    if (!a && !b) {
      currentCat = null;
      continue;
    }

    const spend = cellNum(row[2]);
    const budget = cellNum(row[3]);
    const overUnder = cellNum(row[4]);

    if (b.endsWith("-Total")) {
      currentCat = {
        id: slugCategory(a),
        category: a,
        label: a,
        spend,
        budget,
        overUnder,
        projection: spend, // replaced by annotateProjections below
        subs: [],
        isUncategorized: false,
      };
      categories.push(currentCat);
      continue;
    }

    if (currentCat && a && b) {
      currentCat.subs.push({
        id: slugCategory(b),
        category: a,
        label: b,
        spend,
        budget,
        overUnder,
        projection: spend,
        subs: [],
        isUncategorized: false,
      });
    }
  }

  const uncategorizedRow = categories.find(
    (c) => c.category.toLowerCase() === "uncategorized",
  );
  if (!uncategorizedRow && kpis.uncategorizedSpend != null && kpis.uncategorizedSpend > 0) {
    categories.push({
      id: "uncategorized",
      category: "Uncategorized",
      label: "Uncategorized",
      spend: kpis.uncategorizedSpend,
      budget: null,
      overUnder: kpis.uncategorizedSpend,
      projection: kpis.uncategorizedSpend,
      subs: [],
      isUncategorized: true,
    });
  }

  // Want bucket = sum of Want-category spend/budget from the breakdown.
  let wantSpend: number | null = null;
  let wantBudget: number | null = null;
  for (const c of categories) {
    if (c.isUncategorized) continue;
    if (!WANT_CATEGORIES.has(c.category.toLowerCase())) continue;
    if (c.spend != null) wantSpend = (wantSpend ?? 0) + c.spend;
    if (c.budget != null) wantBudget = (wantBudget ?? 0) + c.budget;
  }
  kpis.wantSpend = wantSpend;
  kpis.wantBudget = wantBudget;

  // A finished month gets no lift toward budget — it projects at what posted.
  const monthIsOpen = monthKey >= currentMonthKey(getSpreadsheetTimezone());
  const visible = annotateProjections(
    categories.filter((c) => !c.label.endsWith("-Total")),
    monthIsOpen,
  );

  // Projected total mirrors the Total row's excl.-Travel basis. Uncategorized
  // is already inside the sheet's Total, so it is counted here too.
  const projectedTotal = sumProjections(
    visible.filter((c) => c.category.toLowerCase() !== TRAVEL_CATEGORY),
  );

  return {
    ok: true,
    monthKey,
    kpis,
    categories: visible,
    totalSpendForPct,
    monthIsOpen,
    projectedTotal,
  };
}
