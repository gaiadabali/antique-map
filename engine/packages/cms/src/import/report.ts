/**
 * The run's report (DATA.md §4): every row of the file accounted for — `new`, `updated` (each
 * change shown as it was and as it will be), `unchanged`, `rejected` (with the column, a plain
 * problem and its fix) and `held` (valid, but waiting on a person) — with counts. A row whose
 * answer changed between attempts keeps its last one (a row applied in a transaction that was
 * rolled back is not applied). The report is what the owner reads and the seed prints; nothing
 * else.
 */
import { emptyCounts, type ImportKind, type ImportReport, type Outcome, type ReportRow } from './types'

export class Report {
  readonly kind: ImportKind
  readonly file: string
  readonly runner: string
  readonly dryRun: boolean
  private readonly byRow = new Map<number, ReportRow>()

  constructor(kind: ImportKind, file: string, runner: string, dryRun: boolean) {
    this.kind = kind
    this.file = file
    this.runner = runner
    this.dryRun = dryRun
  }

  /** The row's answer, last write wins — and `unchanged` rows are answerless until counted. */
  record(row: ReportRow) {
    this.byRow.set(row.row, row)
  }

  /** Whether the row already has an answer, from planning or an earlier attempt. */
  has(row: number) {
    return this.byRow.has(row)
  }

  /** Drops `new` and `updated` answers — they were written inside a transaction that rolled back. */
  forgetTransient() {
    for (const [row, answer] of this.byRow) {
      if (answer.outcome === 'new' || answer.outcome === 'updated') this.byRow.delete(row)
    }
  }

  toReport(): ImportReport {
    const counts = emptyCounts()
    const rows: ReportRow[] = []
    for (const answer of this.byRow.values()) {
      counts[answer.outcome] += 1
      rows.push(answer)
    }
    rows.sort((a, b) => a.row - b.row)
    return {
      kind: this.kind,
      file: this.file,
      runner: this.runner,
      dryRun: this.dryRun,
      counts,
      rows,
    }
  }
}

/** The report as the owner reads it: a line per row with a problem or a change, then the counts. */
export function render(report: ImportReport): string {
  const lines: string[] = []
  const { counts } = report
  lines.push(
    `${report.file} — ${report.kind}${report.dryRun ? ' (dry run — nothing written)' : ''}: ` +
      `${counts.new} created, ${counts.updated} updated, ${counts.unchanged} unchanged, ` +
      `${counts.rejected} rejected, ${counts.held} held.`,
  )
  for (const row of report.rows) {
    if (row.outcome === 'updated') {
      const changes = (row.changes ?? []).map(({ column, was, now }) => `${column}: ${was} → ${now}`)
      lines.push(`Row ${row.row} (${row.key}) updated — ${changes.join('; ')}`)
      continue
    }
    const fix = row.fix ? ` ${row.fix}` : ''
    const column = row.column ? ` ${row.column}:` : ''
    lines.push(
      `Row ${row.row} (${row.key}) ${row.outcome} —${column} ${row.problem}.${fix}`,
    )
  }
  return lines.join('\n')
}
