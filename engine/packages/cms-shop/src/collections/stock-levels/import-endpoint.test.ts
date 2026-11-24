/**
 * The import endpoint's upload checks and its screen report (TASKS.md 10.8.a, 27.4.c), with no
 * database: the size and type refusals (a `.csv` or an `.xlsx`, nothing else), and the report
 * trimmed to what the screen lists — the refused rows first, kept when the list is long.
 */
import { describe, expect, it } from 'vitest'

import { MAX_BYTES } from '@engine/cms-core/import/csv'
import { emptyCounts, type ImportReport, type ReportRow } from '@engine/cms-core/import/types'
import { MAX_REPORT_ROWS, refuseUpload, screenReport } from './import-endpoint'

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

describe('refuseUpload', () => {
  it('lets a small .csv through, with or without a media type', () => {
    expect(refuseUpload({ name: 'stock.csv', size: 120, type: 'text/csv' })).toBeNull()
    expect(refuseUpload({ name: 'Stock.CSV', size: 120, type: '' })).toBeNull()
    expect(
      refuseUpload({ name: 'stock.csv', size: 120, type: 'application/vnd.ms-excel' }),
    ).toBeNull()
  })

  it('lets an Excel workbook through by its name and type', () => {
    expect(refuseUpload({ name: 'stock.xlsx', size: 120, type: XLSX })).toBeNull()
    expect(refuseUpload({ name: 'Stock.XLSX', size: 120, type: '' })).toBeNull()
  })

  it('refuses a file over the importer limit before reading it', () => {
    for (const name of ['stock.csv', 'stock.xlsx']) {
      expect(refuseUpload({ name, size: MAX_BYTES + 1, type: '' })).toMatchObject({
        code: 'errorTooBig',
        status: 413,
      })
    }
  })

  it('refuses a macro workbook, an old .xls, a renamed binary and a csv-named script', () => {
    const refused = [
      { name: 'stock.xlsm', type: 'application/vnd.ms-excel.sheet.macroEnabled.12' },
      { name: 'stock.xls', type: 'application/vnd.ms-excel' },
      { name: 'stock.csv', type: 'image/png' },
      { name: 'stock.xlsx', type: 'text/html' },
      { name: 'stock.csv.exe', type: '' },
    ]
    for (const file of refused) {
      expect(refuseUpload({ ...file, size: 10 })).toMatchObject({
        code: 'errorNotSheet',
        status: 415,
      })
    }
  })
})

describe('screenReport', () => {
  const row = (n: number, outcome: ReportRow['outcome']): ReportRow => ({
    row: n,
    key: `k${n}`,
    outcome,
    problem: '',
  })
  const reportOf = (rows: ReportRow[]): ImportReport => {
    const counts = emptyCounts()
    for (const each of rows) counts[each.outcome] += 1
    return { kind: 'stock', file: 'stock.xlsx', runner: 'owner', dryRun: true, counts, rows }
  }

  it('lists the refused rows first, then the changes, each in the sheet’s order', () => {
    const shown = screenReport(
      reportOf([
        row(2, 'new'),
        row(3, 'unchanged'),
        row(4, 'held'),
        row(5, 'updated'),
        row(6, 'rejected'),
      ]),
    )
    expect(shown.rows.map((r) => [r.row, r.outcome])).toEqual([
      [6, 'rejected'],
      [4, 'held'],
      [2, 'new'],
      [5, 'updated'],
    ])
  })

  it('drops unchanged rows, keeps every count, and keeps the refused rows of a long list', () => {
    const rows: ReportRow[] = [row(2, 'unchanged')]
    for (let n = 0; n < MAX_REPORT_ROWS + 1; n += 1) rows.push(row(n + 3, 'new'))
    rows.push(row(MAX_REPORT_ROWS + 10, 'rejected'))
    const shown = screenReport(reportOf(rows))
    expect(shown.rows).toHaveLength(MAX_REPORT_ROWS)
    expect(shown.rows[0]).toMatchObject({ outcome: 'rejected' })
    expect(shown.rows.every((r) => r.outcome !== 'unchanged')).toBe(true)
    expect(shown.truncated).toBe(true)
    expect(shown.counts.new).toBe(MAX_REPORT_ROWS + 1)
  })
})
