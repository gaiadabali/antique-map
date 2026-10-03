/**
 * Cell readers (DATA.md §3 "What a row means"): trimmed, case kept as written; an empty cell is
 * `undefined` — it never clears a field; money and counts are whole numbers, digits optionally
 * grouped in threes by `.` or `,`; a flag is `yes`/`no`; a list is separated by `;`. Every reader
 * answers a plain problem when the value is not what it must be, never a guessed one.
 */

export type Read<T> = { value?: T } | { error: string }

export const ok = <T>(value: T): { value: T } => ({ value })

/** The raw cell, trimmed; `undefined` for empty (an empty cell never clears a field). */
export const cell = (raw: string | undefined): string | undefined => {
  const value = raw?.trim()
  return value === '' || value === undefined ? undefined : value
}

export const text = (raw: string | undefined, column: string, max: number): Read<string> => {
  const value = cell(raw)
  if (value === undefined) return ok(undefined as never)
  if (value.length > max) {
    return { error: `${column} is ${value.length} characters; keep it to ${max}.` }
  }
  return ok(value)
}

/** Whole rupiah or units: `185000`, `185.000`, `185,000` — anything else refused with its fix. */
export function wholeNumber(
  raw: string | undefined,
  column: string,
  options: { min: number; what: string },
): Read<number> {
  const value = cell(raw)
  if (value === undefined) return ok(undefined as never)
  if (/^-?\d+([.,]\d{3})*$/.test(value)) {
    const n = Number(value.replace(/[.,]/g, ''))
    if (Number.isSafeInteger(n) && n >= options.min) return ok(n)
    if (n < options.min) {
      return { error: `${column} is ${n}, but ${options.what} is ${options.min} or more.` }
    }
  }
  return {
    error: `${column} is '${value}', not a number. ${options.what} is whole digits, optionally grouped in threes with '.' or ',': write 185000 for Rp 185.000.`,
  }
}

/** A flag: `yes`/`no`, case-insensitive; empty means undefined. */
export const yesNo = (raw: string | undefined, column: string): { value?: boolean; error?: string } => {
  const value = cell(raw)?.toLowerCase()
  if (value === undefined) return {}
  if (value === 'yes') return { value: true }
  if (value === 'no') return { value: false }
  return { error: `${column} is '${value}'. Write yes or no.` }
}

/** A `;`-separated list of trimmed values, each a plain problem-free string. */
export const list = (raw: string | undefined): readonly string[] | undefined => {
  const value = cell(raw)
  if (value === undefined) return undefined
  return value
    .split(';')
    .map((each) => each.trim())
    .filter((each) => each !== '')
}

/** Whole digits grouped in threes — how a whole number is written back into the report. */
export const grouped = (value: number) => value.toLocaleString('en-US').replace(/,/g, '.')

/** How a change is shown in the report: empty as (blank), otherwise the value as written. */
export const shown = (value: unknown): string =>
  value === undefined || value === null || value === ''
    ? '(blank)'
    : typeof value === 'boolean'
      ? value
        ? 'yes'
        : 'no'
      : String(value)
