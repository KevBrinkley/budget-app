"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoneyRounded } from "@/lib/format";
import type { IncomeRow } from "@/lib/types";

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--gray-5)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 4,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  minHeight: "var(--control-h)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "0 10px",
  fontFamily: "var(--font)",
  fontSize: 13,
  background: "var(--surface)",
};

function defaultDate(monthKey: string): string {
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return iso.startsWith(`${monthKey}-`) ? iso : `${monthKey}-01`;
}

/**
 * Income for the month, listed with its own add/remove controls.
 *
 * Income is stored in a separate "Income" tab rather than as a credit on the
 * Transactions tab, because the Apps Script categorize run deletes every row
 * with a populated Credit column.
 */
export function IncomeSection({
  monthKey,
  onChanged,
}: {
  monthKey: string;
  /** Lets the page refresh Summary figures that depend on income. */
  onChanged?: () => void;
}) {
  // Loaded payload is tagged with the month it came from, so a month switch
  // shows "…" rather than briefly rendering the previous month's entries —
  // no state-syncing effect needed to clear it.
  const [loaded, setLoaded] = useState<{
    month: string;
    rows: IncomeRow[];
    total: number;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [date, setDate] = useState(() => defaultDate(monthKey));
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");

  const fresh = loaded?.month === monthKey ? loaded : null;
  const rows = fresh?.rows ?? [];
  const total = fresh?.total ?? 0;
  const loading = fresh == null;

  useEffect(() => {
    let cancelled = false;
    // Every setState here runs after an await, so the effect body itself never
    // triggers a synchronous cascading render.
    (async () => {
      try {
        const res = await fetch(`/api/income?month=${encodeURIComponent(monthKey)}`);
        const data = await res.json();
        if (cancelled || !data.ok) return;
        setLoaded({
          month: data.monthKey ?? monthKey,
          rows: data.rows || [],
          total: data.total || 0,
        });
      } catch {
        // Income is additive context — never block the transactions table.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [monthKey, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  async function save() {
    if (!source.trim()) {
      setError("Enter a source");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/income/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey, date, source: source.trim(), amount: amt }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Add failed");
        return;
      }
      setSource("");
      setAmount("");
      setAdding(false);
      reload();
      onChanged?.();
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: IncomeRow) {
    if (!window.confirm(`Remove ${row.amt} from ${row.source}?`)) return;
    setDeleting(row.sheetRow);
    try {
      const res = await fetch("/api/income/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetRow: row.sheetRow, source: row.source }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Delete failed");
        return;
      }
      reload();
      onChanged?.();
    } catch {
      setError("Network error — try again");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="section-card">
      <div className="section-header">
        Income{" "}
        <span className="section-sub">
          {loading
            ? "…"
            : rows.length === 0
              ? "Nothing logged for this month"
              : `${rows.length} ${rows.length === 1 ? "entry" : "entries"} · ${formatMoneyRounded(total)}`}
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th className="num">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sheetRow}>
                  <td>{row.dateLabel}</td>
                  <td>{row.source}</td>
                  <td className="num income-amt">{row.amt}</td>
                  <td className="num">
                    <button
                      type="button"
                      className="income-remove"
                      disabled={deleting === row.sheetRow}
                      onClick={() => remove(row)}
                    >
                      {deleting === row.sheetRow ? "…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div style={{ padding: "12px 16px" }}>
        {adding ? (
          <div className="income-form">
            <div>
              <label style={LABEL_STYLE}>Amount</label>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Source</label>
              <input
                type="text"
                placeholder="Paycheck, bonus, refund…"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={INPUT_STYLE}
              />
            </div>
            <div className="income-form-actions">
              <button
                className="btn-secondary"
                style={{ marginTop: 0, width: "auto" }}
                onClick={() => {
                  setAdding(false);
                  setError("");
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button className="btn-primary inline" onClick={save} disabled={saving}>
                {saving ? "Adding…" : "Add income"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="add-txn-btn"
            onClick={() => {
              setDate(defaultDate(monthKey));
              setAdding(true);
            }}
          >
            <span className="add-txn-plus" aria-hidden="true">
              +
            </span>
            Add income
          </button>
        )}
        {error ? <p className="kw-modal-error">{error}</p> : null}
      </div>
    </div>
  );
}
