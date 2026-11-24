/**
 * The dashboard's periods (ANALYTICS.md §8): 7, 30 or 90 days, or a range, each compared with the
 * period of the same length right before it. Days are `YYYY-MM-DD` in UTC+8 (WITA and Singapore
 * time are the same offset) — the same strings collect stamps on `events.day`, so a period is a
 * pair of day strings and an event is in it when its stamped `day` is. Nothing here buckets an
 * event: the arithmetic is on the calendar, and "today" is the one place a clock is read.
 */

export const PRESETS = [7, 30, 90] as const
export type Preset = (typeof PRESETS)[number]

/** The longest range the picker accepts, so one request never scans the whole table. */
export const MAX_RANGE_DAYS = 400

const DAY_MS = 86_400_000
const WITA_MS = 8 * 3_600_000
const DAY_FORMAT = /^\d{4}-\d{2}-\d{2}$/

export type DayRange = { readonly from: string; readonly to: string }

export type Period = DayRange & {
  /** A preset's length, or `range` for a picked pair of days. */
  readonly preset: Preset | 'range'
  /** Days in the period, both ends included. */
  readonly days: number
  /** The period of the same length that ends the day before this one starts. */
  readonly previous: DayRange
}

/** The WITA calendar day an instant falls on. */
export function witaDay(at: Date): string {
  return new Date(at.getTime() + WITA_MS).toISOString().slice(0, 10)
}

const epochDay = (day: string): number => Date.parse(`${day}T00:00:00.000Z`) / DAY_MS

const dayAt = (epoch: number): string => new Date(epoch * DAY_MS).toISOString().slice(0, 10)

/** `day` moved by `n` calendar days. */
export function shiftDay(day: string, n: number): string {
  return dayAt(epochDay(day) + n)
}

function isDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_FORMAT.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function periodOf(from: string, to: string, preset: Period['preset']): Period {
  const days = epochDay(to) - epochDay(from) + 1
  return {
    from,
    to,
    preset,
    days,
    previous: { from: shiftDay(from, -days), to: shiftDay(from, -1) },
  }
}

export type PeriodInput = {
  readonly period?: string | null
  readonly from?: string | null
  readonly to?: string | null
}

/**
 * The period a request asks for, ending today (WITA) for a preset. A range that is malformed,
 * backwards, in the future or longer than `MAX_RANGE_DAYS` falls back to the last 30 days: the
 * picker never shows an error for a hand-edited link.
 */
export function resolvePeriod(input: PeriodInput = {}, now: Date = new Date()): Period {
  const today = witaDay(now)
  if (isDay(input.from) && isDay(input.to)) {
    const days = epochDay(input.to) - epochDay(input.from) + 1
    if (days >= 1 && days <= MAX_RANGE_DAYS && input.to <= today) {
      return periodOf(input.from, input.to, 'range')
    }
  }
  const preset = PRESETS.find((p) => String(p) === input.period) ?? 30
  return periodOf(shiftDay(today, -(preset - 1)), today, preset)
}

/** The instants a day range spans: from 00:00 on `from` to 00:00 after `to`, both at UTC+8. */
export function instantBounds(range: DayRange): { start: Date; end: Date } {
  return {
    start: new Date(epochDay(range.from) * DAY_MS - WITA_MS),
    end: new Date((epochDay(range.to) + 1) * DAY_MS - WITA_MS),
  }
}

/** Both periods at once, for a query over records that carry instants rather than a `day`. */
export function spanBounds(period: Period): { start: Date; end: Date } {
  return { start: instantBounds(period.previous).start, end: instantBounds(period).end }
}
