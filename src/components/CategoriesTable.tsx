"use client";

import { useEffect, useState } from "react";
import type { ReferenceRow } from "@/lib/types";

type ModalState = {
  row: ReferenceRow;
  draft: string;
};

export function CategoriesTable({ rows: initialRows }: { rows: ReferenceRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!modal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  function openModal(row: ReferenceRow) {
    setModal({ row, draft: row.keywords });
    setSaveError("");
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setSaveError("");
  }

  async function handleSave() {
    if (!modal) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetRow: modal.row.sheetRow, keywords: modal.draft }),
      });
      const data = await res.json();
      if (!data.ok) {
        setSaveError(data.error || "Save failed");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.sheetRow === modal.row.sheetRow ? { ...r, keywords: modal.draft } : r,
        ),
      );
      closeModal();
    } catch {
      setSaveError("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  let lastCat = "";

  return (
    <>
      <div className="section-card">
        <div className="table-scroll">
          <table className="data-table cat-edit-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Sub-category</th>
                <th>Keywords</th>
                <th className="num">Monthly budget</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const showCat = row.category !== lastCat;
                lastCat = row.category;
                return (
                  <tr
                    key={`${row.category}-${row.subCategory}-${i}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => openModal(row)}
                  >
                    <td>{showCat ? row.category : ""}</td>
                    <td>{row.subCategory}</td>
                    <td>{row.keywords || "—"}</td>
                    <td className="num">{row.budget || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ padding: "12px 16px", margin: 0, fontSize: 12, color: "var(--gray-5)" }}>
          Click any row to edit its keywords.
        </p>
      </div>

      {modal && (
        <div className="kw-modal-backdrop" onClick={closeModal}>
          <div className="kw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kw-modal-header">
              <div>
                <div className="kw-modal-title">Edit Keywords</div>
                <div className="kw-modal-sub">
                  {modal.row.category}
                  {modal.row.subCategory ? ` › ${modal.row.subCategory}` : ""}
                </div>
              </div>
              <button className="kw-modal-close" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>
            <div className="kw-modal-body">
              <textarea
                className="kw-modal-textarea"
                value={modal.draft}
                onChange={(e) => setModal({ ...modal, draft: e.target.value })}
                rows={4}
                placeholder="keyword1, keyword2, keyword3"
                autoFocus
              />
              <p className="kw-modal-hint">
                Comma-separated. Writes directly to your Reference sheet.
              </p>
              {saveError && <p className="kw-modal-error">{saveError}</p>}
            </div>
            <div className="kw-modal-footer">
              <button
                className="btn-secondary"
                style={{ marginTop: 0, width: "auto" }}
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button className="btn-primary inline" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
