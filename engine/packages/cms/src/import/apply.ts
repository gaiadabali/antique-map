/**
 * The run itself (DATA.md §3 "Two steps, one transaction per file"): a file in, a report out. The
 * rows are planned (`./plan-*`), the file's duplicate keys refuse their rows, and every row that
 * carries data is applied inside the file's one transaction (`./apply-works`, `./apply-shop`).
 *
 * Payload ends the operation's transaction whenever a save is refused (`killTransaction`), so a
 * row the database refuses cannot be healed by a savepoint inside the file's transaction. The
 * run answers that the way the report demands — *the file lands whole or not at all*: a refusal
 **rolls the whole file's transaction back**, the refused row is reported, and the run applies
 * the remaining rows again in a fresh transaction, until every row has an answer (a handful of
 * attempts at most). A refused row is therefore final only once the run's last attempt leaves
 * it refused, and a file with an unexpected database refusal still imports the rest. A dry run
 * applies and then **rolls the whole transaction back**, so its report is the real one and
 * nothing is written.
 */
import type { Payload, PayloadRequest } from 'payload'

import { readFileSync } from 'node:fs'

import { parseCsv } from './csv'
import { keyColumns, template } from './kinds'
import { planAntiqueRow } from './plan-antiques'
import { planDiscountRow, planProductRow, planStockRow, planStoreRow } from './plan-shop'
import { rowOf, type PlannedRow } from './plan'
import { applyWork } from './apply-works'
import { applyShopRow } from './apply-shop'
import { Report } from './report'
import { IMPORT_KINDS, hold, reject, type ImportKind, type ImportReport, type ReportRow } from './types'
import { buildVocabulary, type Vocabulary } from './vocabulary'

export type UpsertResult = {
  readonly outcome: 'new' | 'updated' | 'unchanged'
  readonly changes?: ReadonlyArray<{ column: string; was: string; now: string }>
} | {
  readonly outcome: 'rejected' | 'held'
  readonly problem: { readonly column?: string; readonly problem: string; readonly fix?: string }
}

export type UpsertContext = {
  payload: Payload
  req: PayloadRequest
  vocab: Vocabulary
  publish: boolean
}

export type RunOptions = {
  payload: Payload
  /** Who ran it: the staff user's email, or `seed`. It goes in the report and the logs. */
  runner: string
  dryRun?: boolean
  /** DATA.md's publish-these-records: save published, which runs the publish checks. */
  publish?: boolean
  /** The user the run is for — the owner in the admin; the seed runs with none. */
  user?: PayloadRequest['user']
}

/** Payload keeps its live transactions here; a run checks it to know a refusal killed one. */
const sessions = (payload: Payload): Record<string, unknown> =>
  (payload.db.sessions ?? {}) as Record<string, unknown>

function requestOf(payload: Payload, transactionID: string | undefined, user: PayloadRequest['user']): PayloadRequest {
  return {
    payload,
    user: user ?? null,
    locale: 'en',
    headers: new Headers(),
    transactionID,
    t: (key: string) => key,
  } as unknown as PayloadRequest
}

const MAX_ATTEMPTS = 8

export async function runImportPath(
  kind: ImportKind,
  path: string,
  options: RunOptions,
): Promise<ImportReport> {
  const bytes = new Uint8Array(readFileSync(path))
  return runImportFile(kind, path.split(/[\\/]/).pop() ?? path, bytes, options)
}

export async function runImportFile(
  kind: ImportKind,
  fileName: string,
  bytes: Uint8Array,
  options: RunOptions,
): Promise<ImportReport> {
  if (!IMPORT_KINDS.includes(kind)) throw new Error(`Unknown import kind '${kind}'.`)
  const sheet = parseCsv(fileName, bytes, kind, template(kind))
  const { payload } = options

  // The vocabularies are read once, outside any transaction — they are a snapshot for matching,
  // and no row's refusal may depend on them.
  const vocab = await buildVocabulary(payload, requestOf(payload, undefined, options.user))
  const plannedRows = plan(kind, sheet, vocab)

  const report = new Report(kind, fileName, options.runner, options.dryRun === true)
  // Planning answers and duplicate keys are final before anything is written.
  for (const planned of plannedRows) {
    if ('problems' in planned) report.record(reject(planned.row, planned.key, one(planned.problems)))
    else if ('hold' in planned) report.record(hold(planned.row, planned.key, one(planned.hold)))
  }
  const duplicated = markDuplicates(plannedRows, report)

  let attempt = 0
  for (;;) {
    attempt += 1
    const transactionID = ((await payload.db.beginTransaction()) ?? undefined) as string | undefined
    const req = requestOf(payload, transactionID, options.user)
    const ctx: UpsertContext = { payload, req, vocab, publish: options.publish === true }
    let killed = false

    for (const planned of plannedRows as Array<PlannedRow & { collection: string }>) {
      if (duplicated.has(planned.row) || report.has(planned.row)) continue
      const session = transactionID === undefined ? undefined : sessions(payload)[transactionID]
      if (session) {
        await payload.db.execute({ db: (session as { db: unknown }).db as never, raw: `SAVEPOINT import_row_${planned.row}` })
      }
      try {
        const result =
          planned.collection === 'works'
            ? await applyWork(ctx, planned as never)
            : await applyShopRow(ctx, planned as never)
        if (session) {
          await payload.db.execute({ db: (session as { db: unknown }).db as never, raw: `RELEASE SAVEPOINT import_row_${planned.row}` })
        }
        if (result.outcome === 'rejected') report.record(reject(planned.row, planned.key, result.problem))
        else if (result.outcome === 'held') report.record(hold(planned.row, planned.key, result.problem))
        else {
          report.record({
            row: planned.row,
            key: planned.key,
            outcome: result.outcome,
            ...(result.outcome === 'updated' ? { changes: result.changes ?? [] } : {}),
          } as ReportRow)
        }
      } catch (error) {
        if (session) {
          try {
            await payload.db.execute({ db: (session as { db: unknown }).db as never, raw: `ROLLBACK TO SAVEPOINT import_row_${planned.row}` })
          } catch {
            // The refusal already killed the transaction; the restart below re-applies the file.
          }
        }
        report.record(
          reject(planned.row, planned.key, {
            problem: error instanceof Error ? error.message : 'The row was refused.',
          }),
        )
        if (transactionID === undefined || !sessions(payload)[transactionID]) {
          killed = true
          break
        }
      }
    }

    // Rows recorded `new` or `updated` in a killed attempt were rolled back with it: forget them.
    if (killed) report.forgetTransient()
    if (transactionID !== undefined) {
      const alive = Boolean(sessions(payload)[transactionID])
      if (options.dryRun === true || killed) {
        await payload.db.rollbackTransaction(transactionID).catch(() => undefined)
      } else if (alive) {
        await payload.db.commitTransaction(transactionID)
      }
    }
    if (!killed || attempt >= MAX_ATTEMPTS) break
  }

  return report.toReport()
}

/** Planning: the rows of one file, in order, each refused or held or carrying its data. */
function plan(kind: ImportKind, sheet: ReturnType<typeof parseCsv>, vocab: Vocabulary): PlannedRow[] {
  const keys = keyColumns(kind)
  const plannedRows: PlannedRow[] = []
  for (const { row, cells } of sheet.rows) {
    const rowOfSheet = rowOf(row, sheet.header, cells, (by) =>
      keys
        .map((column) => (by[column] ?? '').trim())
        .filter((part) => part !== '')
        .join(' + '),
    )
    if (kind === 'antiques') {
      plannedRows.push(planAntiqueRow(rowOfSheet, vocab))
    } else if (kind === 'products') {
      const isVariant = (rowOfSheet.cells.parent_sku ?? '').trim() !== ''
      plannedRows.push(planProductRow(rowOfSheet, vocab, isVariant))
    } else if (kind === 'stores') {
      plannedRows.push(planStoreRow(rowOfSheet))
    } else if (kind === 'stock') {
      plannedRows.push(planStockRow(rowOfSheet))
    } else {
      plannedRows.push(planDiscountRow(rowOfSheet))
    }
  }
  return plannedRows
}

/** A key the file carries twice refuses both its rows and applies neither (DATA.md §3). */
function markDuplicates(plannedRows: readonly PlannedRow[], report: Report): Set<number> {
  const counts = new Map<string, number>()
  for (const planned of plannedRows) {
    if ('problems' in planned || 'hold' in planned) continue
    counts.set(planned.key, (counts.get(planned.key) ?? 0) + 1)
  }
  const rowsByDuplicateKey = new Map<string, number[]>()
  for (const planned of plannedRows) {
    if ('problems' in planned || 'hold' in planned) continue
    if ((counts.get(planned.key) ?? 0) < 2) continue
    const rows = rowsByDuplicateKey.get(planned.key) ?? []
    rows.push(planned.row)
    rowsByDuplicateKey.set(planned.key, rows)
  }
  const skip = new Set<number>()
  for (const [key, rows] of rowsByDuplicateKey) {
    const listed = rows.join(' and row ')
    for (const row of rows) {
      skip.add(row)
      report.record(
        reject(row, key, {
          problem: `This key is on row ${listed}. One key, one record — leave it on one row only.`,
        }),
      )
    }
  }
  return skip
}

/** One is enough for the report: the first problem names the column to fix. */
function one(problems: ReadonlyArray<{ column?: string; problem: string; fix?: string }>) {
  return problems[0]!
}
