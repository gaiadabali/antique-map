/**
 * What every normaliser returns: the raw value as the old store held it, a
 * value only when the reading is certain, and otherwise a proposal for a
 * person to accept or correct (MIGRATION.md §4: "never guessed into a field").
 *
 * The value shapes mirror the engine's contracts rather than inventing new
 * ones — `FuzzyDate` is C2's `FuzzyDateVM`, a size is C2's `SizeVM` in
 * millimetres, a price is C5's `Money` in integer minor units with
 * CONTENT-MODEL.md's pricing modes. They are restated here, structurally, so
 * the CLIs run under Node's type stripping with no engine package loaded at
 * run time (imports from the engine are type-only, and erased);
 * `test/contracts.test-d.ts` holds them to C2 and C5 at compile time.
 */
import type { CurrencyCode } from '@engine/config/constants'

/** At or above this a reading goes into the field; below it, into the review file. */
export const CONFIDENT = 0.9

export type FieldStatus = 'parsed' | 'review' | 'empty'

export type Parsed<T> = {
  /** Exactly what the source held (`null` when the source had no such value). */
  readonly raw: string | null
  readonly status: FieldStatus
  /** Set only when `status` is `parsed`. */
  readonly value: T | null
  /** The best reading for a person to confirm — the value itself when parsed. */
  readonly proposal: T | null
  /** 0–1: how sure the parser is of `proposal`. */
  readonly confidence: number
  /** Why the field was sent to review or left empty; `null` when it parsed cleanly. */
  readonly reason: string | null
}

/** A certain reading — or, below `CONFIDENT`, a proposal for review. */
export function accept<T>(
  raw: string | null,
  value: T,
  confidence = 1,
  reason: string | null = null,
): Parsed<T> {
  if (confidence < CONFIDENT) return review(raw, value, reason ?? 'below confidence', confidence)
  return { raw, status: 'parsed', value, proposal: value, confidence, reason }
}

export function review<T>(
  raw: string | null,
  proposal: NoInfer<T> | null,
  reason: string,
  confidence = proposal === null ? 0 : 0.5,
): Parsed<T> {
  return {
    raw,
    status: 'review',
    value: null,
    proposal,
    confidence: Math.min(confidence, CONFIDENT - 0.01),
    reason,
  }
}

/** Nothing to migrate: the source was blank, or held only a "no value" marker. */
export function empty<T>(raw: string | null, reason: string | null = null): Parsed<T> {
  return { raw, status: 'empty', value: null, proposal: null, confidence: 1, reason }
}

// ─── value shapes ─────────────────────────────────────────────────────────────

/** C2 `DatePrecision`. Precision is part of the fact: a circa date is never stored as exact. */
export type DatePrecision = 'exact' | 'circa' | 'before' | 'after' | 'range' | 'unknown'

/** C2 `FuzzyDateVM` (CONTENT-MODEL.md §1 `date`): years; `to` only for a range. */
export type FuzzyDate = {
  readonly precision: DatePrecision
  readonly from: number | null
  readonly to: number | null
  /** The cataloguer's wording, kept only where a formatter could not say it ("18th century"). */
  readonly display: string | null
}

/** One measured rectangle, both sides in whole millimetres, in the order the source wrote them. */
export type Measured = {
  readonly sidesMm: readonly [number, number]
  /** The unit as typed — for the audit trail; the value is always millimetres. */
  readonly unit: 'mm' | 'cm'
}

/**
 * The dimensions as measured. Height and width are not known yet: the old
 * catalogue wrote both orders (see `orientation.ts`), so a size becomes C2's
 * `SizeVM` only once an orientation is known.
 */
export type MeasuredDimensions = {
  readonly image: Measured | null
  readonly sheet: Measured | null
}

/** C2 `SizeVM` — millimetres; inches are derived by the formatter, never typed. */
export type Size = { readonly heightMm: number; readonly widthMm: number }

export type Orientation = 'portrait' | 'landscape' | 'square'

/** CONTENT-MODEL.md §1 `condition`: the grade is a term of the brand's scale. */
export type ConditionValue = {
  readonly grade: string
  readonly notes: string | null
}

/** C5 `Money`: a safe integer of minor units, in one of the engine's currencies (C1). */
export type Money = { readonly amount: number; readonly currency: CurrencyCode }

/** CONTENT-MODEL.md §2 `pricing` — the two modes the old store had. */
export type PriceValue =
  | { readonly mode: 'fixed'; readonly base: Money }
  | { readonly mode: 'on-request'; readonly base: null }

/** CONTENT-MODEL.md §1 `references`: the source by name (the sources collection resolves it). */
export type Reference = { readonly source: string; readonly ref: string }

export type StockNumber = {
  readonly value: string
  /** The prefix before the dot (`M`, `P`, `F` …). */
  readonly prefix: string
  /** `numbered` — `M.1044`; `named` — a series name, `M.Dav5`. */
  readonly pattern: 'numbered' | 'named'
}

export type MakerValue = { readonly legacyId: number | null; readonly name: string }

export type CategoryValue = { readonly legacyId: number | null; readonly name: string | null }
