/**
 * The review queue: one row per field below confidence, the raw value beside
 * the proposal (MIGRATION.md §4), as JSON Lines (lossless) and CSV (for a
 * spreadsheet). A person accepts or corrects the proposal; nothing in a row
 * reaches a field on a script's authority.
 */
import { FIELDS, type FieldName, type NormalisedRecord } from './record.ts'

export type ReviewRow = {
  readonly source: string
  readonly recordId: number
  readonly path: string | null
  readonly field: FieldName
  readonly raw: string | null
  /** The proposal as JSON text — `null` when the parser has none to offer. */
  readonly proposal: string | null
  readonly confidence: number
  readonly reason: string
}

export type FieldCounts = { parsed: number; review: number; empty: number }

export function reviewRows(records: readonly NormalisedRecord[]): ReviewRow[] {
  const rows: ReviewRow[] = []
  for (const record of records) {
    for (const field of FIELDS) {
      const parsed = record.fields[field]
      if (parsed.status !== 'review') continue
      rows.push({
        source: record.source,
        recordId: record.legacyId,
        path: record.path,
        field,
        raw: parsed.raw,
        proposal: parsed.proposal === null ? null : JSON.stringify(parsed.proposal),
        confidence: Number(parsed.confidence.toFixed(2)),
        reason: parsed.reason ?? 'below confidence',
      })
    }
  }
  return rows
}

export function countFields(records: readonly NormalisedRecord[]): Record<FieldName, FieldCounts> {
  const counts = Object.fromEntries(
    FIELDS.map((field) => [field, { parsed: 0, review: 0, empty: 0 }]),
  ) as Record<FieldName, FieldCounts>
  for (const record of records) {
    for (const field of FIELDS) counts[field][record.fields[field].status]++
  }
  return counts
}

/** Review reasons per field, most frequent first — what a curator works through. */
export function reasonsByField(
  rows: readonly ReviewRow[],
): Record<string, Array<[string, number]>> {
  const byField = new Map<string, Map<string, number>>()
  for (const row of rows) {
    const reasons = byField.get(row.field) ?? new Map<string, number>()
    const reason = row.reason.replace(/"[^"]*"/g, '"…"')
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
    byField.set(row.field, reasons)
  }
  return Object.fromEntries(
    [...byField].map(([field, reasons]) => [field, [...reasons].sort((a, b) => b[1] - a[1])]),
  )
}

const CSV_COLUMNS = [
  'source',
  'recordId',
  'path',
  'field',
  'raw',
  'proposal',
  'confidence',
  'reason',
] as const

export function toCsv(rows: readonly ReviewRow[]): string {
  const lines = [CSV_COLUMNS.join(',')]
  for (const row of rows) lines.push(CSV_COLUMNS.map((column) => csvCell(row[column])).join(','))
  return `${lines.join('\r\n')}\r\n`
}

/**
 * RFC 4180 quoting, and a leading apostrophe on a cell a spreadsheet would
 * run as a formula (`=`, `+`, `-`, `@`) — the review file is opened in one.
 */
function csvCell(value: string | number | null): string {
  if (value === null) return ''
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toJsonl(items: readonly unknown[]): string {
  return items.map((item) => JSON.stringify(item)).join('\n') + (items.length > 0 ? '\n' : '')
}
