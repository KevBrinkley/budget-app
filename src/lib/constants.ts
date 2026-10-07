/** Transactions column K header (corporate travel checkbox). */
export const CORPORATE_TRAVEL_LABEL = "Corporate Travel";

/**
 * Categories that roll up into the "Want" bucket (vs. "Essentials").
 * Matched case-insensitively against the summary category names. Legacy names
 * (pre-taxonomy-rename) are included so the Want card works before/after the
 * Apps Script Summary tab is regenerated.
 */
export const WANT_CATEGORIES = new Set(
  [
    "Eating Out",
    "Going Out",
    "Golf",
    "Subscriptions",
    "Learning",
    "Things",
    "Other",
    // legacy aliases
    "Want",
    "Fees/Other",
  ].map((s) => s.toLowerCase()),
);

/** Category tracked on its own, excluded from the Want bucket and monthly totals. */
export const TRAVEL_CATEGORY = "travel";

/**
 * Categories whose remaining budget is effectively **committed** — recurring
 * bills and obligations that are guaranteed to land before month end.
 *
 * For these, the Summary "Projection" column reports `max(spend, budget)`
 * rather than spend-to-date, because an Obligations row showing "$1,100 under"
 * on the 5th is misleading: that $1,100 of insurance/utilities is already
 * spoken for. Categories not listed here project at their current spend.
 *
 * Only applied to an OPEN month — a finished month projects at what actually
 * posted, never up to its budget.
 *
 * NOTE: placeholder list pending the user's own — edit freely, names are
 * matched case-insensitively against the Reference taxonomy.
 */
export const PROJECTED_CATEGORIES = new Set(
  [
    "Rent/Mortgage",
    "Obligations",
    "Subscriptions",
    "Health and Wellness",
  ].map((s) => s.toLowerCase()),
);
