import type { InboxRow } from "./types";

/** Merchant names vary in spacing/case between feeds — compare loosely. */
function normalizeDesc(desc: string): string {
  return desc.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Flag uncategorized rows that share an exact dollar amount with another row
 * *from a different merchant*.
 *
 * Same amount from the same place needs no warning — it is either a genuine
 * repeat or an obvious duplicate. The ambiguous case, and the one that makes
 * amount-based matching unsafe, is two different merchants landing on the same
 * number. Those are the rows worth a second look before categorizing.
 */
export function annotateDuplicateAmounts(rows: InboxRow[]): InboxRow[] {
  const byCents = new Map<number, InboxRow[]>();
  for (const row of rows) {
    const key = Math.round(row.amount * 100);
    const bucket = byCents.get(key);
    if (bucket) bucket.push(row);
    else byCents.set(key, [row]);
  }

  return rows.map((row) => {
    const group = byCents.get(Math.round(row.amount * 100)) ?? [];
    if (group.length < 2) return row;

    const others = group.filter(
      (other) =>
        other.sheetRow !== row.sheetRow &&
        normalizeDesc(other.desc) !== normalizeDesc(row.desc),
    );
    if (others.length === 0) return row; // same amount, same merchant — not ambiguous

    return {
      ...row,
      duplicateAmount: {
        count: others.length,
        others: others.map((o) => o.desc),
      },
    };
  });
}
