"use client";

import { useEffect, useState } from "react";
import { CategoryPicker, CategoryPickerTrigger } from "./CategoryPicker";
import type { CategoryRef, ManualTransactionInput } from "@/lib/types";

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

/** Today, or the 1st of the viewed month when browsing a different month. */
function defaultDate(monthKey: string): string {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  return iso.startsWith(`${monthKey}-`) ? iso : `${monthKey}-01`;
}

export function AddTransactionModal({
  monthKey,
  categoryRef,
  onClose,
  onAdded,
  onToast,
}: {
  monthKey: string;
  categoryRef: CategoryRef;
  onClose: () => void;
  onAdded: () => void;
  onToast: (msg: string) => void;
}) {
  const [date, setDate] = useState(() => defaultDate(monthKey));
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [travel, setTravel] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function save() {
    if (!desc.trim()) {
      setError("Enter a description");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    if (Boolean(category) !== Boolean(subCategory)) {
      setError("Pick category and sub-category");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload: ManualTransactionInput & { monthKey: string } = {
        monthKey,
        date,
        desc: desc.trim(),
        amount: amt,
        category,
        subCategory,
        travel,
      };
      const res = await fetch("/api/inbox/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Add failed");
        return;
      }
      onToast("Transaction added");
      onAdded();
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="kw-modal-backdrop" onClick={() => !saving && onClose()}>
        <div
          className="kw-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Add transaction"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="kw-modal-header">
            <div>
              <div className="kw-modal-title">Add transaction</div>
              <div className="kw-modal-sub">
                Matches itself to the real one when it posts
              </div>
            </div>
            <button className="kw-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="kw-modal-body">
            <div className="field" style={{ marginTop: 0 }}>
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

            <div className="field">
              <label style={LABEL_STYLE}>Description</label>
              <input
                type="text"
                placeholder="Where did you spend it?"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                style={INPUT_STYLE}
              />
            </div>

            <div className="field">
              <label style={LABEL_STYLE}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={INPUT_STYLE}
              />
            </div>

            <div className="field">
              <label style={LABEL_STYLE}>Category (optional)</label>
              <CategoryPickerTrigger
                category={category}
                subCategory={subCategory}
                onOpen={() => setPickerOpen(true)}
                emptyLabel="Leave uncategorized"
              />
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

            {error ? <p className="kw-modal-error">{error}</p> : null}
          </div>

          <div className="kw-modal-footer">
            <button
              className="btn-secondary"
              style={{ marginTop: 0, width: "auto" }}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="btn-primary inline" onClick={save} disabled={saving}>
              {saving ? "Adding…" : "Add transaction"}
            </button>
          </div>
        </div>
      </div>

      {pickerOpen ? (
        <CategoryPicker
          categoryRef={categoryRef}
          category={category}
          subCategory={subCategory}
          onSelect={(cat, sub) => {
            setCategory(cat);
            setSubCategory(sub);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </>
  );
}
