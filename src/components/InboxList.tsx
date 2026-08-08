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
  const [deleting, setDeleting] = useState<number | null>(null);
  const [savingAmount, setSavingAmount] = useState<number | null>(null);
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

  async function saveRow(row: InboxRow, category: string, subCategory: string, travel: boolean) {
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
          travel,
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

  function shiftAfterDelete(deletedRow: number) {
    setRows((prev) =>
      prev
        .filter((r) => r.sheetRow !== deletedRow)
        .map((r) => (r.sheetRow > deletedRow ? { ...r, sheetRow: r.sheetRow - 1 } : r)),
    );
  }

  async function deleteRow(row: InboxRow) {
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
      shiftAfterDelete(row.sheetRow);
      setOpenRow(null);
      showToast("Deleted");
    } catch {
      showToast("Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  async function saveAmount(row: InboxRow, amount: number) {
    if (!Number.isFinite(amount) || amount < 0) {
      showToast("Enter a valid amount");
      return;
    }
    setSavingAmount(row.sheetRow);
    try {
      const res = await fetch("/api/inbox/save", {
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

        {(() => {
          const wantSpend = summaryKpis?.wantSpend ?? null;
          const wantBudget = summaryKpis?.wantBudget ?? null;
          const overUnder =
            wantSpend != null && wantBudget != null ? wantBudget - wantSpend : null;
          return (
            <div className="kpi-card" style={{ cursor: "default" }}>
              <div className="kpi-label">Want</div>
              <div className="kpi-value">
                {formatMoneyRounded(wantSpend)}
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
        })()}

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
                deleting={deleting === row.sheetRow}
                savingAmount={savingAmount === row.sheetRow}
                onToggle={() =>
                  setOpenRow((cur) => (cur === row.sheetRow ? null : row.sheetRow))
                }
                onSave={(r, cat, sub, travel) => saveRow(r, cat, sub, travel)}
                onDelete={deleteRow}
                onSaveAmount={saveAmount}
                onToast={showToast}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

type KwModal = {
  keyword: string;
  category: string;
  subCategory: string;
};

function InboxItem({
  row,
  ref,
  categories,
  open,
  saving,
  deleting,
  savingAmount,
  onToggle,
  onSave,
  onDelete,
  onSaveAmount,
  onToast,
}: {
  row: InboxRow;
  ref: CategoryRef;
  categories: string[];
  open: boolean;
  saving: boolean;
  deleting: boolean;
  savingAmount: boolean;
  onToggle: () => void;
  onSave: (row: InboxRow, cat: string, sub: string, travel: boolean) => void;
  onDelete: (row: InboxRow) => void;
  onSaveAmount: (row: InboxRow, amount: number) => void;
  onToast: (msg: string) => void;
}) {
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [travel, setTravel] = useState(false);
  const [amountDraft, setAmountDraft] = useState(String(row.amount));
  const subs = category ? ref[category] || [] : [];

  useEffect(() => {
    setAmountDraft(String(row.amount));
  }, [row.amount, row.sheetRow]);

  const amountChanged = amountDraft.trim() !== String(row.amount);

  const [kwModal, setKwModal] = useState<KwModal | null>(null);
  const [kwSaving, setKwSaving] = useState(false);
  const [kwError, setKwError] = useState("");
  const [applyToTxn, setApplyToTxn] = useState(false);
  const kwSubs = kwModal?.category ? ref[kwModal.category] || [] : [];

  useEffect(() => {
    if (!kwModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setKwModal(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [kwModal]);

  function openKwModal() {
    setKwModal({ keyword: row.desc, category, subCategory });
    setKwError("");
    setApplyToTxn(false);
  }

  async function saveKeyword() {
    if (!kwModal) return;
    if (!kwModal.keyword.trim()) { setKwError("Enter a keyword"); return; }
    if (!kwModal.category || !kwModal.subCategory) { setKwError("Pick category and sub-category"); return; }
    setKwSaving(true);
    setKwError("");
    try {
      const res = await fetch("/api/categories/add-keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: kwModal.keyword.trim(),
          category: kwModal.category,
          subCategory: kwModal.subCategory,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setKwError(data.error || "Save failed"); return; }
      const shouldApply = applyToTxn;
      const applyCat = kwModal.category;
      const applySub = kwModal.subCategory;
      setKwModal(null);
      if (shouldApply) {
        onSave(row, applyCat, applySub, travel);
      } else {
        onToast("Keyword saved");
      }
    } catch {
      setKwError("Network error — try again");
    } finally {
      setKwSaving(false);
    }
  }

  return (
    <>
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
              <label>Amount</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={amountDraft}
                  onChange={(e) => setAmountDraft(e.target.value)}
                  style={{ flex: 1, minWidth: 0 }}
                  aria-label={`Amount for ${row.desc}`}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: 0, width: "auto" }}
                  disabled={!amountChanged || savingAmount}
                  onClick={() => onSaveAmount(row, Number(amountDraft))}
                >
                  {savingAmount ? "…" : "Update"}
                </button>
              </div>
            </div>
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
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 14,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--navy)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={travel}
                onChange={(e) => setTravel(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--blue)", cursor: "pointer" }}
              />
              Corporate Travel
            </label>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 0, width: "auto" }}
                onClick={openKwModal}
              >
                Add Keyword
              </button>
              <button
                type="button"
                className="btn-primary inline"
                disabled={saving}
                onClick={() => onSave(row, category, subCategory, travel)}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => onDelete(row)}
              disabled={deleting}
              style={{
                marginTop: 14,
                background: "none",
                border: "none",
                color: "var(--red)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              {deleting ? "Deleting…" : "Delete transaction"}
            </button>
          </div>
        ) : null}
      </article>

      {kwModal ? (
        <div className="kw-modal-backdrop" onClick={() => !kwSaving && setKwModal(null)}>
          <div className="kw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kw-modal-header">
              <div>
                <div className="kw-modal-title">Add Keyword</div>
                <div className="kw-modal-sub">Writes to your Reference sheet</div>
              </div>
              <button className="kw-modal-close" onClick={() => setKwModal(null)} aria-label="Close">×</button>
            </div>
            <div className="kw-modal-body">
              <div className="field" style={{ marginTop: 0 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--gray-5)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Keyword</label>
                <input
                  autoFocus
                  type="text"
                  value={kwModal.keyword}
                  onChange={(e) => setKwModal({ ...kwModal, keyword: e.target.value })}
                  style={{ width: "100%", minHeight: "var(--control-h)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontFamily: "var(--font)", fontSize: 13, background: "var(--surface)" }}
                />
              </div>
              <div className="field">
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--gray-5)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Category</label>
                <select
                  value={kwModal.category}
                  onChange={(e) => setKwModal({ ...kwModal, category: e.target.value, subCategory: "" })}
                  style={{ width: "100%", minHeight: "var(--control-h)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontFamily: "var(--font)", fontSize: 13, background: "var(--surface)" }}
                >
                  <option value="">Choose…</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--gray-5)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Sub-category</label>
                <select
                  value={kwModal.subCategory}
                  onChange={(e) => setKwModal({ ...kwModal, subCategory: e.target.value })}
                  disabled={!kwModal.category}
                  style={{ width: "100%", minHeight: "var(--control-h)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontFamily: "var(--font)", fontSize: 13, background: "var(--surface)" }}
                >
                  <option value="">Choose…</option>
                  {kwSubs.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 14,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--navy)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={applyToTxn}
                  onChange={(e) => setApplyToTxn(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "var(--blue)", cursor: "pointer" }}
                />
                Apply to this transaction?
              </label>
              {kwError && <p className="kw-modal-error">{kwError}</p>}
            </div>
            <div className="kw-modal-footer">
              <button className="btn-secondary" style={{ marginTop: 0, width: "auto" }} onClick={() => setKwModal(null)} disabled={kwSaving}>Cancel</button>
              <button className="btn-primary inline" onClick={saveKeyword} disabled={kwSaving}>
                {kwSaving ? "Saving…" : "Save Keyword"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
