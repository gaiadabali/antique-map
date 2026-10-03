/**
 * The spreadsheet import's shared shapes (DATA.md §3–§4): one file in, typed rows, a run and a
 * report out. The kinds (`./kinds-*`) turn rows into plans, `./apply` plans the run against the
 * database, `./cli.ts` and the admin action (`../admin/import`) are its two entrances.
 *
 * - **Outcomes** are DATA.md §4's: `new`, `updated`, `unchanged`, `rejected` (invalid — fix the
 *   file), `held` (valid, but waiting on a person: an unknown maker, a missing image).
 * - **A report row** names the sheet's row and key, the column and a plain problem and fix, and
 *   for an update each value that changes (`was` → `now`).
 */

export type ImportKind = 'antiques' | 'products' | 'stores' | 'stock' | 'discounts'

export const IMPORT_KINDS: readonly ImportKind[] = [
  'antiques',
  'products',
  'stores',
  'stock',
  'discounts',
]

export type Outcome = 'new' | 'updated' | 'unchanged' | 'rejected' | 'held'

/** One problem with one cell of one row: what is wrong and what to do, plainly (DATA.md §4). */
export type Problem = {
  readonly column?: string
  readonly problem: string
  readonly fix?: string
}

export type ReportRow = {
  /** The sheet's line number: 1 is the header, the first data row is 2. */
  readonly row: number
  readonly key: string
  readonly outcome: Outcome
  /** When the outcome is `updated`: each change as the old and new value, plainly. */
  readonly changes?: ReadonlyArray<{ column: string; was: string; now: string }>
} & Problem

export type ImportReport = {
  readonly kind: ImportKind
  readonly file: string
  /** Who ran it: the staff user's email, or `seed` for the seed's runs. */
  readonly runner: string
  readonly dryRun: boolean
  readonly counts: Readonly<Record<Outcome, number>>
  readonly rows: readonly ReportRow[]
}

export const emptyCounts = (): Record<Outcome, number> => ({
  new: 0,
  updated: 0,
  unchanged: 0,
  rejected: 0,
  held: 0,
})

/** A rejected or held row, as the report carries it. */
export const reject = (row: number, key: string, problem: Problem): ReportRow => ({
  row,
  key,
  outcome: 'rejected',
  ...problem,
})

export const hold = (row: number, key: string, problem: Problem): ReportRow => ({
  row,
  key,
  outcome: 'held',
  ...problem,
})
