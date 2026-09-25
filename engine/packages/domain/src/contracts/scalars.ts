/**
 * @contract C5–C8 shared — scalar vocabulary · owner: ARC
 *
 * The small value types every domain contract speaks. One rule for time: JSON on the wire (C6
 * requests and responses, C7 webhook payloads, C12 snapshots) carries `IsoInstant` strings;
 * in-process service signatures (`reserve()`, the machines) take `Date`.
 */

/** An ISO 8601 instant in UTC, e.g. `2026-09-25T07:30:00.000Z` — the wire form of a moment. */
export type IsoInstant = string

/** An ISO 8601 calendar date, e.g. `2026-09-25` — a day with no time (a viewing, a document date). */
export type IsoDate = string

/**
 * An exact decimal as text, e.g. `'16234.5'` or `'0.035'`: FX rates, tax rates and percentages
 * that must reproduce exactly on a document. Never parsed into a float for money arithmetic.
 */
export type DecimalString = `${number}`

/**
 * An exact ratio of integers in minor units, e.g. `'13750000000/12'`: an unrounded figure,
 * recorded beside the rounded one it produced. Never a float.
 */
export type ExactRatio = `${bigint}/${bigint}`

/**
 * A length of time with its unit in its name. Providers disagree (Stripe seconds, Midtrans
 * minutes, Date milliseconds); a bare number here is how a 15-minute lock becomes 15 seconds.
 */
export type Duration = { readonly seconds: number }
