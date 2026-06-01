"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDelta, formatMoneyRounded } from "@/lib/format";
import type { CategoryRef, InboxRow, SummaryKpis } from "@/lib/types";

type Props = {
  monthKey: string;
  initialRef: CategoryRef;
  initialRows: InboxRow[];
  summaryKpis?: SummaryKpis | null;
};

export function InboxList({ monthKey, initialRef, initialRows, summaryKpis }: Props) {
  const [ref] = useState(initialRef);
  const [rows, setRows] = useState(initialRows);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const categories = useMemo(() => Object.keys(ref).sort(), [ref]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.desc.toLowerCase().includes(q) || r.amt.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const hasSearch = Boolean(search.trim());

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  async function saveRow(row: InboxRow, category: string, subCategory: string) {
    if (!category || !subCategory) {
      showToast("Pick category and subcategory");
      return;
    }
    setSaving(row.sheetRow);
    try {
      const res = await fetch("/api/inbox/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthKey,
          sheetRow: row.sheetRow,
          category,
          subCategory,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.error || "Save failed");
        return;
      }
      setRows((prev) => prev.filter((r) => r.sheetRow !== row.sheetRow));
      setOpenRow(null);
      showToast("Saved");
    } catch {
      showToast("Save failed");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      {toast ? (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 72,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a2332",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            zIndex: 50,
          }}
        >
          {toast}
        </div>
      ) : null}

      <div className="content-inner">
        <div className="kpi-row cols-3">
          <Link className="kpi-card" href={`/transactions?month=${monthKey}`}>
            <div className="kpi-label">Total spend</div>
            <div className="kpi-value">
              {formatMoneyRounded(summaryKpis?.totalSpend ?? null)}
            </div>
            <div className="kpi-sub">
              {summaryKpis?.totalBudget != null ? (
                <>
                  <span
                    className={`delta ${formatDelta((summaryKpis.totalSpend ?? 0) - summaryKpis.totalBudget).cls}`}
                  >
                    {formatDelta((summaryKpis.totalSpend ?? 0) - summaryKpis.totalBudget).text}
                  </span>{" "}
                  vs budget
                </>
              ) : (
                "This month"
              )}
            </div>
          </Link>
          <Link className="kpi-card" href={`/transactions?month=${monthKey}`}>
            <div className="kpi-label">NM/T total</div>
            <div className="kpi-value">
              {formatMoneyRounded(summaryKpis?.nmtSpend ?? null)}
            </div>
            <div className="kpi-sub">
              {summaryKpis?.nmtBudget != null ? (
                <>
                  <span
                    className={`delta ${formatDelta((summaryKpis.nmtSpend ?? 0) - summaryKpis.nmtBudget).cls}`}
                  >
                    {formatDelta((summaryKpis.nmtSpend ?? 0) - summaryKpis.nmtBudget).text}
                  </span>{" "}
                  vs budget
                </>
              ) : (
                "This month"
              )}
            </div>
          </Link>
          <div className="kpi-card">
            <div className="kpi-label">Uncategorized</div>
            <div className="kpi-value warn">
              {formatMoneyRounded(summaryKpis?.uncategorizedSpend ?? null)}
            </div>
            <div className="kpi-sub">
              {hasSearch ? `${filtered.length} in search · ` : `${rows.length} open · `}
              {summaryKpis?.uncategorizedSpend != null && summaryKpis.uncategorizedSpend > 0 ? (
                <span className={`delta ${formatDelta(summaryKpis.uncategorizedSpend).cls}`}>
                  {formatDelta(summaryKpis.uncategorizedSpend).text}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="section-card txn-filter-card">
          <div className="filter-bar">
            <span className="filter-label">Filter:</span>
            <input
              type="search"
              placeholder="Search transactions…"
              style={{ minWidth: 200 }}
              aria-label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="btn-reset"
              disabled={!hasSearch}
              onClick={() => setSearch("")}
            >
              Reset
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p style={{ padding: "24px 0", color: "var(--gray-5)", fontSize: 14 }}>
            {rows.length === 0
              ? "Nothing to categorize — you're caught up for this month."
              : "No matches for your search."}
          </p>
        ) : (
          <div className="inbox-stack" role="list">
            {filtered.map((row) => (
              <InboxItem
                key={row.sheetRow}
                row={row}
                ref={ref}
                categories={categories}
                open={openRow === row.sheetRow}
                saving={saving === row.sheetRow}
                onToggle={() =>
                  setOpenRow((cur) => (cur === row.sheetRow ? null : row.sheetRow))
                }
                onSave={saveRow}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function InboxItem({
  row,
  ref,
  categories,
  open,
  saving,
  onToggle,
  onSave,
}: {
  row: InboxRow;
  ref: CategoryRef;
  categories: string[];
  open: boolean;
  saving: boolean;
  onToggle: () => void;
  onSave: (row: InboxRow, cat: string, sub: string) => void;
}) {
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const subs = category ? ref[category] || [] : [];

  return (
    <article className={`acc-item${open ? " open" : ""}`} role="listitem">
      <button
        type="button"
        className="acc-head"
        aria-expanded={open}
        onClick={onToggle}
      >
        <div className="tx-top">
          <span className="tx-desc">{row.amt}</span>
          <span className="tx-date">{row.date}</span>
        </div>
        <p className="inbox-merchant">{row.desc}</p>
        <div className="tx-meta">
          <span
            className="badge"
            style={{ background: "var(--gray-2)", color: "var(--gray-6)" }}
          >
            Uncategorized
          </span>
        </div>
      </button>
      {open ? (
        <div className="acc-panel">
          <div className="field">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubCategory("");
              }}
            >
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Sub-category</label>
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              disabled={!category}
            >
              <option value="">Choose…</option>
              {subs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn-primary inline"
            style={{ marginTop: 12 }}
            disabled={saving}
            onClick={() => onSave(row, category, subCategory)}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
