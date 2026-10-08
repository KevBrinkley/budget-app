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
 * Categories whose remaining budget is effectively **committed** — spending
 * that is guaranteed to land before month end, whether a fixed bill or a
 * recurring habit.
 *
 * For these, the Summary "Projection" column reports `max(spend, budget)`
 * rather than spend-to-date, because an Obligations row showing "$1,020 under"
 * on the 7th is misleading: that $1,020 of insurance/utilities is already
 * spoken for. Categories not listed here project at their current spend.
 *
 * `max` rather than a flat budget so a category already over budget projects
 * at what has actually posted — projecting Health and Wellness to its $200
 * budget after $249 has cleared would show it landing below money already out
 * the door.
 *
 * Only applied to an OPEN month — a finished month projects at what actually
 * posted, never up to its budget.
 *
 * Names are matched case-insensitively against the Reference taxonomy.
 */
export const PROJECTED_CATEGORIES = new Set(
  [
    // Essentials
    "Rent/Mortgage",
    "Obligations",
    "Groceries",
    "Transportation",
    "Health and Wellness",
    // Want
    "Eating Out",
    "Golf",
    "Subscriptions",
  ].map((s) => s.toLowerCase()),
);

/**
 * Expected monthly income, mirroring the `Income` row on the sheet's
 * "Yearly Projection" tab. Used when logged income does not yet add up to a
 * full month — see `resolveMonthIncome`.
 */
export const DEFAULT_MONTHLY_INCOME = 11888;

/**
 * Share of DEFAULT_MONTHLY_INCOME that logged income must reach before it is
 * trusted as the month's real total.
 *
 * Pay is bimonthly, so one cheque lands near 50% of the month — far below this
 * and treated as incomplete. Two real cheques (e.g. 5,500 + 5,700 = 11,200,
 * i.e. 94%) clear it comfortably and override the default, which is the point:
 * the actual total is rarely exactly 11,888.
 */
export const INCOME_OVERRIDE_THRESHOLD = 0.75;
