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
