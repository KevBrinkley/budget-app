"use client";

import { useEffect, useMemo } from "react";
import type { CategoryRef } from "@/lib/types";

export type CategoryGroup = { category: string; subCategories: string[] };

/**
 * Flatten a CategoryRef into the sorted, render-ready group list.
 *
 * The Reference tab carries rows the picker should never offer: category
 * header rows leave the Sub-Category cell blank, and a category can repeat a
 * sub-category name. Blanks are dropped, names are de-duped, and a category
 * left with nothing to pick is dropped along with them.
 */
export function buildCategoryGroups(ref: CategoryRef): CategoryGroup[] {
  return Object.keys(ref)
    .sort()
    .map((category) => ({
      category,
      subCategories: Array.from(
        new Set((ref[category] || []).map((s) => s.trim()).filter(Boolean)),
      ),
    }))
    .filter((g) => g.category.trim() && g.subCategories.length > 0);
}

type Props = {
  categoryRef: CategoryRef;
  /** Currently applied pair, highlighted with a check. */
  category: string;
  subCategory: string;
  onSelect: (category: string, subCategory: string) => void;
  onClose: () => void;
  title?: string;
};

/**
 * Full-list category picker: every category with its sub-categories nested
 * underneath, always expanded. Picking a sub-category selects the pair and
 * closes — the category alone is never a valid selection.
 */
export function CategoryPicker({
  categoryRef,
  category,
  subCategory,
  onSelect,
  onClose,
  title = "Choose category",
}: Props) {
  const groups = useMemo(() => buildCategoryGroups(categoryRef), [categoryRef]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="kw-modal-backdrop" onClick={onClose}>
      <div
        className="kw-modal cat-picker"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kw-modal-header">
          <div>
            <div className="kw-modal-title">{title}</div>
            <div className="kw-modal-sub">Tap a sub-category to apply it</div>
          </div>
          <button className="kw-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="kw-modal-body">
            <p className="kw-modal-hint" style={{ margin: 0 }}>
              No categories found in your Reference sheet.
            </p>
          </div>
        ) : (
          <div className="cat-picker-list">
            {groups.map((g) => (
              <div key={g.category} className="cat-picker-group">
                <div className="cat-picker-cat">{g.category}</div>
                {g.subCategories.map((sub) => {
                  const selected = category === g.category && subCategory === sub;
                  return (
                    <button
                      key={sub}
                      type="button"
                      className={`cat-picker-sub${selected ? " selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => onSelect(g.category, sub)}
                    >
                      <span>{sub}</span>
                      {selected ? <span className="cat-picker-check">✓</span> : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The button that opens the picker — shows the chosen pair, or the empty
 * prompt when nothing is picked yet.
 */
export function CategoryPickerTrigger({
  category,
  subCategory,
  onOpen,
  emptyLabel = "Add category",
}: {
  category: string;
  subCategory: string;
  onOpen: () => void;
  emptyLabel?: string;
}) {
  const picked = Boolean(category && subCategory);
  return (
    <button
      type="button"
      className={`cat-trigger${picked ? " picked" : ""}`}
      onClick={onOpen}
    >
      {picked ? (
        <span className="cat-trigger-value">
          <span className="cat-trigger-cat">{category}</span>
          <span className="cat-trigger-sep" aria-hidden="true">
            ›
          </span>
          <span className="cat-trigger-sub">{subCategory}</span>
        </span>
      ) : (
        <span className="cat-trigger-empty">{emptyLabel}</span>
      )}
      <span className="cat-trigger-chevron" aria-hidden="true">
        ›
      </span>
    </button>
  );
}
