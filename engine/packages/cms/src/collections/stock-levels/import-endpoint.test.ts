/**
 * The stock import endpoint's upload checks and its screen report (TASKS.md 10.8.a), with no
 * database: the size and type refusals, and the report trimmed to what the screen lists.
 */
import { describe, expect, it } from 'vitest'

import { MAX_BYTES } from '../../import/csv'
import { emptyCounts, type ImportReport, type ReportRow } from '../../import/types'
import { MAX_REPORT_ROWS, refuseUpload, screenReport } from './import-endpoint'

describe('refuseUpload', () => {
  it('lets a small .csv through, with or without a media type', () => {
    expect(refuseUpload({ name: 'stock.csv', size: 120, type: 'text/csv' })).toBeNull()
    expect(refuseUpload({ name: 'Stock.CSV', size: 120, type: '' })).toBeNull()
    expect(
      refuseUpload({ name: 'stock.csv', size: 120, type: 'application/vnd.ms-excel' }),
    ).toBeNull()
  })

  it('refuses a file over the importer limit before reading it', () => {
    expect(
      refuseUpload({ name: 'stock.csv', size: MAX_BYTES + 1, type: 'text/csv' }),
    ).toMatchObject({
      code: 'errorTooBig',
      status: 413,
    })
  })

  it('refuses a workbook, a renamed binary and a csv-named script', () => {
    const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    expect(refuseUpload({ name: 'stock.xlsx', size: 10, type: xlsx })).toMatchObject({
      code: 'errorNotCsv',
      status: 415,
    })
    expect(refuseUpload({ name: 'stock.csv', size: 10, type: 'image/png' })).toMatchObject({
      code: 'errorNotCsv',
    })
    expect(refuseUpload({ name: 'stock.csv.exe', size: 10, type: '' })).toMatchObject({
      code: 'errorNotCsv',
    })
  })
})

describe('screenReport', () => {
  const row = (n: number, outcome: ReportRow['outcome']): ReportRow => ({
    row: n,
    key: `k${n}`,
    outcome,
    problem: '',
  })

  it('drops unchanged rows, keeps every count and flags a long list', () => {
    const rows: ReportRow[] = [row(2, 'unchanged')]
    for (let n = 0; n < MAX_REPORT_ROWS + 1; n += 1) rows.push(row(n + 3, 'rejected'))
    const report: ImportReport = {
      kind: 'stock',
      file: 'stock.csv',
      runner: 'owner',
      dryRun: true,
      counts: { ...emptyCounts(), unchanged: 1, rejected: MAX_REPORT_ROWS + 1 },
      rows,
    }
    const shown = screenReport(report)
    expect(shown.rows).toHaveLength(MAX_REPORT_ROWS)
    expect(shown.rows.every((r) => r.outcome !== 'unchanged')).toBe(true)
    expect(shown.truncated).toBe(true)
    expect(shown.counts.rejected).toBe(MAX_REPORT_ROWS + 1)
  })
})
