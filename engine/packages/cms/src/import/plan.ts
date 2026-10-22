/**
 * A planned row: the data one sheet row would write, or why it is refused (`problems` — fix the
 * file), or held (`hold` — valid, but waiting on a person: a maker the file names that the CMS
 * does not have yet, DATA.md §3). Planning is pure: it reads the cells and the controlled lists;
 * anything needing the database happens in `./apply`, which owns the run.
 */
import type { Problem } from './types'

export type ImportCollection = 'works' | 'products' | 'stores' | 'stock-levels' | 'discounts'

/** A row that carries the data it would write. */
export type WritableRow = {
  readonly row: number
  readonly key: string
  readonly collection: ImportCollection
  readonly data: Record<string, unknown>
  /** Relative or absolute file paths to turn into `media` rows, in sheet order. */
  readonly imageFiles?: readonly string[]
}

export type PlannedRow =
  | WritableRow
  | { readonly row: number; readonly key: string; readonly problems: readonly Problem[] }
  | { readonly row: number; readonly key: string; readonly hold: readonly Problem[] }

export const planned = (
  row: number,
  key: string,
  collection: ImportCollection,
  data: Record<string, unknown>,
  imageFiles?: readonly string[],
): WritableRow => ({ row, key, collection, data, ...(imageFiles ? { imageFiles } : {}) })

export const refused = (row: number, key: string, problems: readonly Problem[]): PlannedRow => ({
  row,
  key,
  problems,
})

export const holding = (row: number, key: string, hold: readonly Problem[]): PlannedRow => ({
  row,
  key,
  hold,
})

/** One sheet row: its line number and its cells by column name. */
export type Row = {
  readonly row: number
  readonly key: string
  readonly cells: Readonly<Record<string, string | undefined>>
}

/** The row's cells by column name, with the key assembled. */
export function rowOf(
  row: number,
  header: readonly string[],
  cells: readonly string[],
  keyOf: (byName: Readonly<Record<string, string | undefined>>) => string,
): Row {
  const byName: Record<string, string | undefined> = {}
  header.forEach((name, i) => {
    byName[name] = cells[i]
  })
  return { row, key: keyOf(byName), cells: byName }
}

/** Whether one option's value or label matches what the cell said (case-insensitive). */
export function pickOption(
  options: readonly string[],
  raw: string,
  _column: string,
): string | null {
  const value = raw.trim()
  const lower = value.toLowerCase()
  const hit =
    options.find((option) => option === value) ??
    options.find((option) => option.toLowerCase() === lower) ??
    options.find((option) => option.replace(/-/g, ' ').toLowerCase() === lower.replace(/-/g, ' '))
  return hit ?? null
}

/** The plain refusal for a controlled-list cell nothing matched. */
export function optionProblem(column: string, raw: string, options: readonly string[]): Problem {
  return {
    column,
    problem: `${column} is '${raw.trim()}'. Write one of: ${options.join(', ')}.`,
  }
}

/** The rows that carry data to write, in sheet order. */
export const writable = (rows: readonly PlannedRow[]): readonly PlannedRow[] =>
  rows.filter((row) => (row as { collection?: unknown }).collection !== undefined)
