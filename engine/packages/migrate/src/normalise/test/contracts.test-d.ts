/**
 * Type-level tests (TASKS.md 7.4.b): the normalisers' value shapes are the engine's — a date is
 * C2's `FuzzyDateVM`, a size C2's `SizeVM`, a fixed price's base C5's `Money` — so the loader
 * (36.x) writes what a normaliser proposes without reshaping it. Compiled by `tsc` in
 * `pnpm typecheck`, never run (vitest collects `*.test.ts`, not `*.test-d.ts`) and never
 * exported. If a line here stops compiling — or an `@ts-expect-error` stops being an error —
 * a shape has drifted from its contract.
 *
 * Where a shape genuinely differs it is said here, not hidden:
 * - A circa range ("ca. 1690-1700") has no C2 shape: `FuzzyDateVM` holds one precision, so
 *   `parseDate` proposes the `range` and sends it to review (dates.ts). The proposal is still a
 *   `FuzzyDateVM`; the "circa" is in the review reason, for a person.
 * - `NormalisedRecord['sizes']` is C2's `DimensionsVM` without `framed`: the old store recorded
 *   no framed size, so the loader adds `framed: null`.
 * - `Money['currency']` is any `string` here, C5's is a `CurrencyCode`: see the last block.
 */
import type {
  DatePrecision as C2DatePrecision,
  DimensionsVM,
  FuzzyDateVM,
  Money as C5Money,
  SizeVM,
} from '@engine/view-models'

import type { NormalisedRecord } from '../record.ts'
import type { DatePrecision, FuzzyDate, Money, Parsed, PriceValue, Size } from '../types.ts'

/** Resolves only for exactly `true`: `Assert<false>` is a compile error. */
type Assert<T extends true> = T
/** Exact equality, `readonly` included. */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
/** Each assignable to the other (TypeScript ignores `readonly` in assignability). */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

type ValueOf<P> = P extends Parsed<infer T> ? T : never
type Fields = NormalisedRecord['fields']

// ─── C2 FuzzyDateVM ───────────────────────────────────────────────────────────

type _Precision = Assert<Equals<DatePrecision, C2DatePrecision>>
type _Date = Assert<Same<FuzzyDate, FuzzyDateVM>>
type _DateField = Assert<Same<ValueOf<Fields['date']>, FuzzyDateVM>>

// ─── C2 SizeVM / DimensionsVM ─────────────────────────────────────────────────

type _Size = Assert<Same<Size, SizeVM>>
type Sizes = NonNullable<NormalisedRecord['sizes']>
type _Sizes = Assert<Same<Sizes, Omit<DimensionsVM, 'framed'>>>
type _Framed = Assert<[Sizes & { framed: null }] extends [DimensionsVM] ? true : false>

// ─── C5 Money ─────────────────────────────────────────────────────────────────

type FixedBase = Extract<ValueOf<Fields['price']>, { mode: 'fixed' }>['base']
type _Base = Assert<Equals<FixedBase, Money>>
type _Amount = Assert<Equals<Money['amount'], C5Money['amount']>>
type _Keys = Assert<Equals<keyof Money, keyof C5Money>>
type _OnRequest = Assert<Equals<Extract<PriceValue, { mode: 'on-request' }>['base'], null>>

// The currency is the one drift, kept visible: a normalised price's currency is any code the
// tables know, C5's only an engine `CurrencyCode`. Narrowing it needs `CURRENCY_EXPONENT` at
// run time (TASKS.md 7.4.b); when it is narrowed, this expectation fails and becomes an Assert.
// @ts-expect-error — a normalised Money is not yet a C5 Money
type _Money = Assert<Same<Money, C5Money>>
