"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { formatDelta, formatMoneyRounded } from "@/lib/format";
import { formatMonthLabel } from "@/lib/month";
import { WANT_CATEGORIES } from "@/lib/constants";
import type { SummaryCategoryRow, SummaryData } from "@/lib/types";

function bucketOf(cat: SummaryCategoryRow): "Essentials" | "Want" | null {
  if (cat.isUncategorized) return null;
  return WANT_CATEGORIES.has(cat.category.toLowerCase()) ? "Want" : "Essentials";
}

/**
 * Over/under coloring for budgets: under budget = green, over = red.
 * The sheet stores overUnder as (spend − budget), so we negate to get
 * (budget − spend): positive/under → green "$X", negative/over → red "($X)".
 */
function overUnderDelta(overUnder: number | null) {
  return formatDelta(overUnder == null ? null : -overUnder);
}

export function SummaryView({ data, inboxOpen }: { data: SummaryData; inboxOpen?: number }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maxSpend = useMemo(() => {
    let max = 0;
    for (const cat of data.categories) {
      if (cat.spend != null && cat.spend > max) max = cat.spend;
    }
    return max || 1;
  }, [data.categories]);

  const bucketTotals = useMemo(() => {
    const t: Record<string, { spend: number | null; budget: number | null }> = {
      Essentials: { spend: null, budget: null },
      Want: { spend: null, budget: null },
    };
    for (const cat of data.categories) {
      const b = bucketOf(cat);
      if (!b) continue;
      if (cat.spend != null) t[b].spend = (t[b].spend ?? 0) + cat.spend;
      if (cat.budget != null) t[b].budget = (t[b].budget ?? 0) + cat.budget;
    }
    return t;
  }, [data.categories]);

  const kpis = data.kpis;

  return (
    <div className="content-inner">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Link className="kpi-card" href={`/transactions?month=${data.monthKey}`}>
          <div className="kpi-label">Total spend</div>
          <div className="kpi-value">{formatMoneyRounded(kpis.totalSpend)}</div>
          <div className="kpi-sub">
            {kpis.totalBudget != null ? (
              <span className={`delta ${formatDelta((kpis.totalSpend ?? 0) - kpis.totalBudget).cls}`}>
                {formatDelta((kpis.totalSpend ?? 0) - kpis.totalBudget).text}
              </span>
            ) : null}{" "}
            vs budget
          </div>
        </Link>
        <Link className="kpi-card" href={`/inbox?month=${data.monthKey}`}>
          <div className="kpi-label">Uncategorized</div>
          <div className="kpi-value warn">{formatMoneyRounded(kpis.uncategorizedSpend)}</div>
          <div className="kpi-sub">
            {inboxOpen != null ? `${inboxOpen} open · ` : ""}
            {kpis.uncategorizedSpend != null && kpis.uncategorizedSpend > 0 ? (
              <span className={`delta ${formatDelta(kpis.uncategorizedSpend).cls}`}>
                {formatDelta(kpis.uncategorizedSpend).text}
              </span>
            ) : null}
          </div>
        </Link>
      </div>

      <WantCard kpis={kpis} />

      <div className="section-card">
        <div className="section-header">
          Category breakdown{" "}
          <span className="section-sub">Expand a category for sub-category totals</span>
        </div>
        <div className="table-wrap">
          <table className="data-table summary-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="num">Spend</th>
                <th className="num">Budget</th>
                <th className="num">Over / under</th>
                <th className="num hide-sm">% of total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const seenBuckets = new Set<string>();
                const out: ReactNode[] = [];

                const totOverUnder =
                  kpis.totalSpend != null && kpis.totalBudget != null
                    ? kpis.totalSpend - kpis.totalBudget
                    : null;
                const totd = overUnderDelta(totOverUnder);
                out.push(
                  <tr key="bucket-total" className="sum-bucket-row sum-total-row">
                    <td>Total</td>
                    <td className="num">{formatMoneyRounded(kpis.totalSpend)}</td>
                    <td className="num">{formatMoneyRounded(kpis.totalBudget)}</td>
                    <td className="num">
                      <span className={`delta ${totd.cls}`}>{totd.text}</span>
                    </td>
                    <td className="num hide-sm" />
                  </tr>,
                );

                for (const cat of data.categories) {
                  const bucket = bucketOf(cat);
                  if (bucket && !seenBuckets.has(bucket)) {
                    seenBuckets.add(bucket);
                    const bt = bucketTotals[bucket];
                    const bOverUnder =
                      bt.spend != null && bt.budget != null ? bt.spend - bt.budget : null;
                    const bd = overUnderDelta(bOverUnder);
                    out.push(
                      <tr key={`bucket-${bucket}`} className="sum-bucket-row">
                        <td>{bucket}</td>
                        <td className="num">{formatMoneyRounded(bt.spend)}</td>
                        <td className="num">{formatMoneyRounded(bt.budget)}</td>
                        <td className="num">
                          <span className={`delta ${bd.cls}`}>{bd.text}</span>
                        </td>
                        <td className="num hide-sm" />
                      </tr>,
                    );
                  }
                  out.push(
                    <CategoryBlock
                      key={cat.id}
                      cat={cat}
                      monthKey={data.monthKey}
                      expanded={Boolean(expanded[cat.id])}
                      onToggle={() => toggle(cat.id)}
                      totalSpend={data.totalSpendForPct}
                      maxSpend={maxSpend}
                    />,
                  );
                }
                return out;
              })()}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {(inboxOpen ?? 0) > 0 ? (
          <Link className="btn-primary inline" href={`/inbox?month=${data.monthKey}`}>
            Review inbox ({inboxOpen})
          </Link>
        ) : null}
        <Link className="btn-ghost" href={`/transactions?month=${data.monthKey}`} style={{ display: "inline-flex", alignItems: "center", minHeight: 36 }}>
          View all transactions
        </Link>
      </div>
    </div>
  );
}

function WantCard({ kpis }: { kpis: SummaryData["kpis"] }) {
  const overUnder =
    kpis.wantSpend != null && kpis.wantBudget != null
      ? kpis.wantBudget - kpis.wantSpend
      : null;
  return (
    <div className="kpi-card" style={{ cursor: "default" }}>
      <div className="kpi-label">Want</div>
      <div className="kpi-value">
        {formatMoneyRounded(kpis.wantSpend)}
        {overUnder != null ? (
          <span
            style={{
              marginLeft: 8,
              fontSize: 15,
              fontWeight: 700,
              color: overUnder >= 0 ? "var(--green)" : "var(--red)",
            }}
          >
            (
            {overUnder >= 0
              ? `$${Math.round(overUnder).toLocaleString("en-US")} under`
              : `$${Math.round(Math.abs(overUnder)).toLocaleString("en-US")} over`}
            )
          </span>
        ) : null}
      </div>
      <div className="kpi-sub">Discretionary spending vs budget</div>
    </div>
  );
}

function CategoryBlock({
  cat,
  monthKey,
  expanded,
  onToggle,
  totalSpend,
  maxSpend,
}: {
  cat: SummaryCategoryRow;
  monthKey: string;
  expanded: boolean;
  onToggle: () => void;
  totalSpend: number;
  maxSpend: number;
}) {
  const spendOver =
    cat.spend != null && cat.budget != null && cat.spend > cat.budget;
  const pct =
    cat.spend != null && totalSpend > 0
      ? Math.round((cat.spend / totalSpend) * 100)
      : null;
  const barWidth =
    cat.spend != null && maxSpend > 0
      ? Math.min(100, Math.round((cat.spend / maxSpend) * 100))
      : 0;

  const txnHref = (sub?: string) => {
    const params = new URLSearchParams({ month: monthKey, category: cat.category });
    if (sub) params.set("sub", sub);
    return `/transactions?${params.toString()}`;
  };

  if (cat.isUncategorized) {
    return (
      <tr className="sum-cat-row" onClick={() => (window.location.href = `/inbox?month=${monthKey}`)} style={{ cursor: "pointer" }}>
        <td className="sum-cat-cell">
          <span className="sum-expand-spacer" aria-hidden="true" />
          <span className="sum-cat-label" style={{ color: "var(--blue)" }}>
            Uncategorized
          </span>
        </td>
        <td className={`num amt${spendOver ? " amt-over" : ""}`} style={{ color: "var(--blue)" }}>
          {formatMoneyRounded(cat.spend)}
        </td>
        <td className="num">—</td>
        <td className="num">
          <span className={`delta ${overUnderDelta(cat.overUnder).cls}`}>{overUnderDelta(cat.overUnder).text}</span>
        </td>
        <td className="num hide-sm">—</td>
      </tr>
    );
  }

  return (
    <>
      <tr className={`sum-cat-row${expanded ? " expanded" : ""}`}>
        <td className="sum-cat-cell">
          {cat.subs.length > 0 ? (
            <button
              type="button"
              className={`sum-expand-btn${expanded ? " expanded" : ""}`}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Collapse" : "Expand"} ${cat.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            </button>
          ) : (
            <span className="sum-expand-spacer" aria-hidden="true" />
          )}
          <span className="sum-cat-label">{cat.label}</span>
        </td>
        <td className={`num amt${spendOver ? " amt-over" : ""}`}>{formatMoneyRounded(cat.spend)}</td>
        <td className="num">{formatMoneyRounded(cat.budget)}</td>
        <td className="num">
          <span className={`delta ${overUnderDelta(cat.overUnder).cls}`}>
            {overUnderDelta(cat.overUnder).text}
          </span>
        </td>
        <td className="num hide-sm">
          <div className="bar-cell">
            <div className="bar-bg">
              <div className="bar-fill" style={{ width: `${barWidth}%` }} />
            </div>
            {pct != null ? `${pct}%` : "—"}
          </div>
        </td>
      </tr>
      {cat.subs.map((sub) => {
        const subOver =
          sub.spend != null && sub.budget != null && sub.spend > sub.budget;
        const subPct =
          sub.spend != null && totalSpend > 0
            ? Math.round((sub.spend / totalSpend) * 100)
            : null;
        return (
          <tr
            key={sub.id}
            className="sum-sub-row"
            hidden={!expanded}
            style={{ cursor: "pointer" }}
            onClick={() => (window.location.href = txnHref(sub.label))}
          >
            <td className="sum-cat-cell">
              <span className="sum-cat-label">{sub.label}</span>
            </td>
            <td className={`num amt${subOver ? " amt-over" : ""}`}>{formatMoneyRounded(sub.spend)}</td>
            <td className="num">{formatMoneyRounded(sub.budget)}</td>
            <td className="num">
              <span className={`delta ${overUnderDelta(sub.overUnder).cls}`}>
                {overUnderDelta(sub.overUnder).text}
              </span>
            </td>
            <td className="num hide-sm">{subPct != null ? `${subPct}%` : "—"}</td>
          </tr>
        );
      })}
    </>
  );
}

export function summaryPageTitle(monthKey: string): string {
  return `${formatMonthLabel(monthKey)} Summary`;
}
