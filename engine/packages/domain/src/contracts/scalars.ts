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
 * An exact decimal as text — FX rates, tax rates and percentages that must reproduce exactly on a
 * document: `'16234.5'` (a rate), `'3.5'` (a percentage; the field names its unit, as `bufferPct`
 * does). Never parsed into a float for money arithmetic.
 */
export type DecimalString = `${number}`

/**
 * An exact ratio of integers in minor units, e.g. `'13750000000/12'`: an unrounded figure,
 * recorded beside the rounded one it produced. Never a float.
 */
export type ExactRatio = `${bigint}/${bigint}`

/** The JSON form of an in-process type: every `Date` becomes an `IsoInstant`, nothing else moves. */
export type Wire<T> = T extends Date
  ? IsoInstant
  : T extends readonly (infer E)[]
    ? readonly Wire<E>[]
    : T extends object
      ? { readonly [K in keyof T]: Wire<T[K]> }
      : T

/** A JSON-safe value: what an outbox row or a webhook body may carry. */
export type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue }

/**
 * A provider's webhook as it arrived. Signatures are verified on `rawBody` exactly as received —
 * never on re-serialised JSON. `headers` is structurally what the Fetch `Headers` class offers.
 */
export type RawWebhook = {
  readonly headers: { get(name: string): string | null }
  readonly rawBody: string
}

/**
 * A length of time with its unit in its name. Providers disagree (Stripe seconds, Midtrans
 * minutes, Date milliseconds); a bare number here is how a 15-minute lock becomes 15 seconds.
 */
export type Duration = { readonly seconds: number }

/**
 * How an adapter derives the dedupe key of a provider's event (C7: payments, shipping,
 * fulfilment), so a repeated delivery is recognised and two distinct events never collide:
 * - `provider-event-id` — the provider's own event id (`source` names where it lives);
 * - `state-hash` — sha256 of the listed fields joined by `|`, for a provider whose notifications
 *   carry no event id: distinct states give distinct keys, a repeated delivery the same key;
 * - `staff-entry` — recorded by hand in the admin: the id of the admin action.
 * `Field` names a notification field for what it means; each adapter maps it to its provider's path.
 */
export type EventIdRule<Field extends string = string> =
  | { readonly kind: 'provider-event-id'; readonly source: string }
  | { readonly kind: 'state-hash'; readonly fields: readonly Field[] }
  | { readonly kind: 'staff-entry' }
