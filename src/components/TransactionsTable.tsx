"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SourceBadge } from "@/components/SourceBadge";
import { CORPORATE_TRAVEL_LABEL } from "@/lib/constants";
import { formatDelta, formatMoneyRounded } from "@/lib/format";
import { computeTransactionKpis } from "@/lib/transaction-kpis";
import type { CategoryRef, SummaryKpis, TransactionRow, TransactionSource } from "@/lib/types";

type SourceFilter = "all" | "uncategorized" | "manual" | "keyword" | "travel";

type UnsavedDraft = { category: string; subCategory: string };

export function TransactionsTable({
  monthKey,
  initialRef,
  initialRows,
  filterCategory,
  filterSub,
  summaryKpis,
  inboxOpen,
}: {
  monthKey: string;
  initialRef: CategoryRef;
  initialRows: TransactionRow[];
  filterCategory?: string;
  filterSub?: string;
  summaryKpis?: SummaryKpis | null;
  inboxOpen?: number;
}) {
  const router = useRouter();
  const [ref] = useState(initialRef);
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(filterCategory || "");
  const [subFilter, setSubFilter] = useState(filterSub || "");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [saving, setSaving] = useState<number | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [travelSaving, setTravelSaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [savingAmount, setSavingAmount] = useState<number | null>(null);
  const [unsavedDrafts, setUnsavedDrafts] = useState<
    Map<number, UnsavedDraft | null>
  >(() => new Map());
  const [toast, setToast] = useState("");

  useEffect(() => {
    setRows(initialRows);
    setUnsavedDrafts(new Map());
  }, [initialRows]);

  useEffect(() => {
    setCategoryFilter(filterCategory || "");
    setSubFilter(filterSub || "");
  }, [filterCategory, filterSub, monthKey]);

  const categories = useMemo(() => Object.keys(ref).sort(), [ref]);

  const subOptions = useMemo(() => {
    if (!categoryFilter) return [];
    return ref[categoryFilter] || [];
  }, [ref, categoryFilter]);

  const syncUrl = useCallback(
    (category: string, sub: string) => {
      const params = new URLSearchParams({ month: monthKey });
      if (category) params.set("category", category);
      if (sub) params.set("sub", sub);
      router.replace(`/transactions?${params.toString()}`, { scroll: false });
    },
    [monthKey, router],
  );

  const filtered = useMemo(() => {
    let list = rows;
    if (categoryFilter) {
      list = list.filter((r) => r.category === categoryFilter);
    }
    if (subFilter) {
      list = list.filter((r) => r.subCategory === subFilter);
    }
    if (sourceFilter === "uncategorized") {
      list = list.filter((r) => r.source === "uncategorized");
    } else if (sourceFilter === "manual") {
      list = list.filter((r) => r.source === "manual");
    } else if (sourceFilter === "keyword") {
      list = list.filter((r) => r.source === "keyword");
    } else if (sourceFilter === "travel") {
      list = list.filter((r) => r.travel);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.desc.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.subCategory.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, categoryFilter, subFilter, sourceFilter, search]);

  const kpis = useMemo(() => computeTransactionKpis(filtered), [filtered]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(categoryFilter) ||
    Boolean(subFilter) ||
    sourceFilter !== "all";

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  const reportUnsaved = useCallback(
    (sheetRow: number, draft: UnsavedDraft | null | undefined) => {
      setUnsavedDrafts((prev) => {
        if (draft === undefined) {
          if (!prev.has(sheetRow)) return prev;
          const next = new Map(prev);
          next.delete(sheetRow);
          return next;
        }
        if (draft === null) {
          if (prev.has(sheetRow) && prev.get(sheetRow) === null) return prev;
          const next = new Map(prev);
          next.set(sheetRow, null);
          return next;
        }
        const existing = prev.get(sheetRow);
        if (
          existing &&
          existing.category === draft.category &&
          existing.subCategory === draft.subCategory
        ) {
          return prev;
        }
        const next = new Map(prev);
        next.set(sheetRow, draft);
        return next;
      });
    },
    [],
  );

  async function persistCategoryRow(
    row: TransactionRow,
    category: string,
    subCategory: string,
  ): Promise<boolean> {
    const res = await fetch("/api/transactions/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthKey,
        sheetRow: row.sheetRow,
        category,
        subCategory,
        travel: row.travel,
      }),
    });
    const data = await res.json();
    if (!data.ok) return false;
    setRows((prev) =>
      prev.map((r) =>
        r.sheetRow === row.sheetRow
          ? {
              ...r,
              category,
              subCategory,
              source: "manual" as TransactionSource,
            }
          : r,
      ),
    );
    reportUnsaved(row.sheetRow, undefined);
    return true;
  }

  async function saveTravelRow(row: TransactionRow, travel: boolean) {
    setTravelSaving(row.sheetRow);
    try {
      const res = await fetch("/api/transactions/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthKey,
          sheetRow: row.sheetRow,
          travel,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.error || "Save failed");
        return false;
      }
      setRows((prev) =>
        prev.map((r) => (r.sheetRow === row.sheetRow ? { ...r, travel } : r)),
      );
      return true;
    } catch {
      showToast("Save failed");
      return false;
    } finally {
      setTravelSaving(null);
    }
  }

  async function saveRow(row: TransactionRow, category: string, subCategory: string) {
    if (!category || !subCategory) {
      showToast("Pick category and sub-category");
      return;
    }
    setSaving(row.sheetRow);
    try {
      const ok = await persistCategoryRow(row, category, subCategory);
      if (!ok) {
        showToast("Save failed");
        return;
      }
      showToast("Saved");
    } catch {
      showToast("Save failed");
    } finally {
      setSaving(null);
    }
  }

  async function saveAmount(row: TransactionRow, amount: number) {
    if (!Number.isFinite(amount) || amount < 0) {
      showToast("Enter a valid amount");
      return;
    }
    setSavingAmount(row.sheetRow);
    try {
      const res = await fetch("/api/transactions/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey, sheetRow: row.sheetRow, amount }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.error || "Save failed");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.sheetRow === row.sheetRow
            ? { ...r, amount, amt: `$${amount.toFixed(2)}` }
            : r,
        ),
      );
      showToast("Amount updated");
    } catch {
      showToast("Save failed");
    } finally {
      setSavingAmount(null);
    }
  }

  async function deleteTransaction(row: TransactionRow) {
    const ok = window.confirm(
      `Delete "${row.desc}" (${row.amt})?\n\nThis permanently removes it from the sheet.`,
    );
    if (!ok) return;
    setDeleting(row.sheetRow);
    try {
      const res = await fetch("/api/transactions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey, sheetRow: row.sheetRow, desc: row.desc }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.error || "Delete failed");
        return;
      }
      // Deleting a sheet row shifts everything below it up by one — mirror that
      // locally so subsequent edits target the right rows without a refetch.
      setRows((prev) =>
        prev
          .filter((r) => r.sheetRow !== row.sheetRow)
          .map((r) =>
            r.sheetRow > row.sheetRow ? { ...r, sheetRow: r.sheetRow - 1 } : r,
          ),
      );
      setUnsavedDrafts((prev) => {
        const next = new Map<number, UnsavedDraft | null>();
        for (const [k, v] of prev) {
          if (k === row.sheetRow) continue;
          next.set(k > row.sheetRow ? k - 1 : k, v);
        }
        return next;
      });
      showToast("Deleted");
    } catch {
      showToast("Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  async function saveAllChanges() {
    const pending = [...unsavedDrafts.entries()].filter(
      (entry): entry is [number, UnsavedDraft] => entry[1] !== null,
    );
    if (pending.length === 0) {
      showToast("Complete category and sub-category for each row first");
      return;
    }
    setSavingAll(true);
    let saved = 0;
    try {
      for (const [sheetRow, draft] of pending) {
        const row = rows.find((r) => r.sheetRow === sheetRow);
        if (!row) continue;
        const ok = await persistCategoryRow(row, draft.category, draft.subCategory);
        if (ok) saved += 1;
      }
      if (saved === pending.length) {
        showToast(`Saved ${saved} change${saved === 1 ? "" : "s"}`);
      } else if (saved > 0) {
        showToast(`Saved ${saved} of ${pending.length} — some rows failed`);
      } else {
        showToast("Save failed");
      }
    } catch {
      showToast("Save failed");
    } finally {
      setSavingAll(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setCategoryFilter("");
    setSubFilter("");
    setSourceFilter("all");
    router.replace(`/transactions?month=${monthKey}`, { scroll: false });
  }

  function onCategoryChange(value: string) {
    setCategoryFilter(value);
    setSubFilter("");
    syncUrl(value, "");
  }

  function onSubChange(value: string) {
    setSubFilter(value);
    syncUrl(categoryFilter, value);
  }

  const unsavedCount = unsavedDrafts.size;
  const saveableCount = [...unsavedDrafts.values()].filter(Boolean).length;

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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="kpi-card">
            <div className="kpi-label">Total spend</div>
            <div className="kpi-value">{formatMoneyRounded(kpis.totalSpend)}</div>
            <div className="kpi-sub">
              {hasActiveFilters ? (
                `${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`
              ) : summaryKpis?.totalBudget != null ? (
                <>
                  <span
                    className={`delta ${formatDelta(kpis.totalSpend - summaryKpis.totalBudget).cls}`}
                  >
                    {formatDelta(kpis.totalSpend - summaryKpis.totalBudget).text}
                  </span>{" "}
                  vs budget
                </>
              ) : (
                `${filtered.length} transactions`
              )}
            </div>
          </div>
          <Link className="kpi-card" href={`/inbox?month=${monthKey}`}>
            <div className="kpi-label">Uncategorized</div>
            <div className="kpi-value warn">{formatMoneyRounded(kpis.uncategorizedSpend)}</div>
            <div className="kpi-sub">
              {hasActiveFilters ? (
                `${kpis.uncategorizedCount} in filter`
              ) : (
                <>
                  {inboxOpen != null ? `${inboxOpen} open · ` : ""}
                  {kpis.uncategorizedSpend > 0 ? (
                    <span className={`delta ${formatDelta(kpis.uncategorizedSpend).cls}`}>
                      {formatDelta(kpis.uncategorizedSpend).text}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </Link>
        </div>

        <div className="section-card txn-filter-card">
          <div className="filter-bar">
            <span className="filter-label">Filter:</span>
            <input
              type="search"
              placeholder="Search description…"
              style={{ minWidth: 180 }}
              aria-label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Category"
              value={categoryFilter}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              aria-label="Sub-category"
              value={subFilter}
              disabled={!categoryFilter}
              onChange={(e) => onSubChange(e.target.value)}
            >
              <option value="">All sub-categories</option>
              {subOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-reset"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>
          <div className="toggle-bar">
            {(
              [
                ["all", "All"],
                ["uncategorized", "Uncategorized"],
                ["manual", "Manual"],
                ["keyword", "Keyword"],
                ["travel", CORPORATE_TRAVEL_LABEL],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`chip${sourceFilter === id ? " on" : ""}`}
                onClick={() => setSourceFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {unsavedCount > 0 ? (
          <div className="unsaved-alert" role="status">
            <strong>
              {unsavedCount} unsaved categorization change{unsavedCount === 1 ? "" : "s"}
            </strong>
            {" — "}
            Select category and sub-category for each row, then click Save. Changes are not written
            to the sheet until you save.{" "}
            <button
              type="button"
              className="unsaved-alert-btn"
              disabled={savingAll || saveableCount === 0}
              onClick={saveAllChanges}
            >
              Save all changes
            </button>
          </div>
        ) : null}

        <div className="section-card txn-table-card">
          <div className="table-wrap">
            <table className="data-table txn-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Sub-category</th>
                  <th className="txn-travel-col">{CORPORATE_TRAVEL_LABEL}</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ color: "var(--gray-5)", fontSize: 14 }}>
                      No transactions match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <TransactionRowEditor
                      key={row.sheetRow}
                      row={row}
                      categories={categories}
                      ref={ref}
                      saving={saving === row.sheetRow}
                      travelSaving={travelSaving === row.sheetRow}
                      deleting={deleting === row.sheetRow}
                      savingAmount={savingAmount === row.sheetRow}
                      onSave={saveRow}
                      onSaveTravel={saveTravelRow}
                      onDelete={deleteTransaction}
                      onSaveAmount={saveAmount}
                      onUnsavedChange={reportUnsaved}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--gray-5)" }}>
          {filtered.length} of {rows.length} transactions
        </p>
      </div>
    </>
  );
}

function TransactionRowEditor({
  row,
  categories,
  ref,
  saving,
  travelSaving,
  deleting,
  savingAmount,
  onSave,
  onSaveTravel,
  onDelete,
  onSaveAmount,
  onUnsavedChange,
}: {
  row: TransactionRow;
  categories: string[];
  ref: CategoryRef;
  saving: boolean;
  travelSaving: boolean;
  deleting: boolean;
  savingAmount: boolean;
  onSave: (row: TransactionRow, cat: string, sub: string) => void;
  onSaveTravel: (row: TransactionRow, travel: boolean) => Promise<boolean>;
  onDelete: (row: TransactionRow) => void;
  onSaveAmount: (row: TransactionRow, amount: number) => void;
  onUnsavedChange: (sheetRow: number, draft: UnsavedDraft | null | undefined) => void;
}) {
  const [category, setCategory] = useState(row.category);
  const [subCategory, setSubCategory] = useState(row.subCategory);
  const [travel, setTravel] = useState(row.travel);
  const [amountDraft, setAmountDraft] = useState(String(row.amount));
  const subs = category ? ref[category] || [] : [];
  const catChanged = category !== row.category || subCategory !== row.subCategory;
  const canSave = Boolean(category && subCategory && catChanged);
  const showSave = Boolean(category || subCategory) && catChanged;
  const amountChanged = amountDraft.trim() !== String(row.amount);

  useEffect(() => {
    setCategory(row.category);
    setSubCategory(row.subCategory);
    setTravel(row.travel);
    setAmountDraft(String(row.amount));
  }, [row.category, row.subCategory, row.travel, row.amount, row.sheetRow]);

  useEffect(() => {
    if (!catChanged) {
      onUnsavedChange(row.sheetRow, undefined);
      return;
    }
    if (category && subCategory) {
      onUnsavedChange(row.sheetRow, { category, subCategory });
    } else {
      onUnsavedChange(row.sheetRow, null);
    }
  }, [catChanged, category, subCategory, onUnsavedChange, row.sheetRow]);

  async function onTravelChange(checked: boolean) {
    setTravel(checked);
    const ok = await onSaveTravel(row, checked);
    if (!ok) setTravel(row.travel);
  }

  return (
    <tr>
      <td className="txn-date-cell">{row.date}</td>
      <td className="txn-desc-cell">
        <div className="txn-desc-row">
          <div className="txn-desc-main">
            <span className="txn-desc-text">{row.desc}</span>
            <div className="txn-amt-edit">
              <span className="txn-amt-prefix">$</span>
              <input
                className="txn-amt-input"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amountDraft}
                onChange={(e) => setAmountDraft(e.target.value)}
                aria-label={`Amount for ${row.desc}`}
              />
              {amountChanged ? (
                <button
                  type="button"
                  className="txn-amt-save"
                  disabled={savingAmount}
                  onClick={() => onSaveAmount(row, Number(amountDraft))}
                >
                  {savingAmount ? "…" : "Update"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </td>
      <td data-label="Category">
        <select
          className="txn-select"
          aria-label={`Category for ${row.desc}`}
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
      </td>
      <td data-label="Sub-category">
        <select
          className="txn-select"
          aria-label={`Sub-category for ${row.desc}`}
          value={subCategory}
          disabled={!category}
          onChange={(e) => setSubCategory(e.target.value)}
        >
          <option value="">Choose…</option>
          {subs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className="txn-travel-col" data-label={CORPORATE_TRAVEL_LABEL}>
        <label className="txn-travel-check">
          <input
            type="checkbox"
            checked={travel}
            disabled={travelSaving}
            aria-label={`${CORPORATE_TRAVEL_LABEL} — ${row.desc}`}
            onChange={(e) => onTravelChange(e.target.checked)}
          />
        </label>
      </td>
      <td data-label="Source">
        <SourceBadge source={row.source} />
      </td>
      <td className="txn-actions-cell">
        <div className="txn-actions">
          {showSave ? (
            <button
              type="button"
              className="txn-save-btn"
              disabled={saving || !canSave}
              onClick={() => onSave(row, category, subCategory)}
            >
              {saving ? "…" : "Save"}
            </button>
          ) : null}
          <button
            type="button"
            className="txn-delete-btn"
            disabled={deleting}
            aria-label={`Delete ${row.desc}`}
            title="Delete transaction"
            onClick={() => onDelete(row)}
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </td>
    </tr>
  );
}
