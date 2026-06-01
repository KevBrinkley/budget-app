"use client";

import { bumpMonth, formatMonthLabel } from "@/lib/month";

export function MonthPicker({
  monthKey,
  onChange,
}: {
  monthKey: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="month-strip">
      <button
        type="button"
        className="month-nav"
        aria-label="Previous month"
        onClick={() => onChange(bumpMonth(monthKey, -1))}
      >
        ‹
      </button>
      <button type="button" className="label" onClick={() => onChange(monthKey)}>
        {formatMonthLabel(monthKey)}
      </button>
      <button
        type="button"
        className="month-nav"
        aria-label="Next month"
        onClick={() => onChange(bumpMonth(monthKey, 1))}
      >
        ›
      </button>
    </div>
  );
}
