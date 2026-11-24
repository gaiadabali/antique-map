/**
 * The Excel reader (TASKS.md 27.4.c; DATA.md §3 "The file"), with no database: the first sheet
 * only, values as the workbook stores them, a formula by its stored result, the sheet's own row
 * numbers, and the refusals — macros, links to other workbooks, a ZIP bomb, an envelope that lies,
 * an old `.xls`, a wrong header — each an `ImportError` with its fix.
 */
import { describe, expect, it } from 'vitest'

import { ImportError } from './csv'
import { STOCK_COLUMNS, STORE_COLUMNS, template } from './kinds'
import { makeXlsx, zip } from './xlsx.test-support'
import { cellText, parseSpreadsheet, parseXlsx } from './xlsx'
import { checkWorkbookEnvelope, MAX_XML_BYTES } from './zip-guard'

const HEADER = [...STOCK_COLUMNS]
const read = (bytes: Uint8Array, name = 'stock.xlsx') =>
  parseXlsx(name, bytes, 'stock', template('stock'))

async function refusal(promise: Promise<unknown>): Promise<ImportError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ImportError)
  expect((error as ImportError).fix).toBeTruthy()
  return error as ImportError
}

describe('parseXlsx', () => {
  it('reads the first sheet as the CSV would carry it, with the sheet’s row numbers', async () => {
    const bytes = makeXlsx(
      [
        HEADER,
        ['UBD-01', 'OEI-MUG', null, 7],
        [null, null, null, null],
        ['UBD-01', 'OEI-PRINT', 'OEI-PRINT-A3', { f: 'B9*0+3', v: 3 }],
      ],
      { more: [[HEADER, ['NOT-READ', 'X', null, 1]]] },
    )
    const sheet = await read(bytes)
    expect(sheet.header).toEqual(HEADER)
    expect(sheet.rows).toEqual([
      { row: 2, cells: ['UBD-01', 'OEI-MUG', '', '7'] },
      // Row 3 is empty and skipped; the formula counts by the result stored with it.
      { row: 4, cells: ['UBD-01', 'OEI-PRINT', 'OEI-PRINT-A3', '3'] },
    ])
  })

  it('keeps numbers exactly as stored, and yes/no from a checkbox column', async () => {
    const bytes = makeXlsx([
      [...STORE_COLUMNS],
      ['UBD-01', 'Ubud', 'Jl. Raya Ubud', 'Ubud', -8.5069, 115.2625, null, null, null, true, false],
    ])
    const sheet = await parseXlsx('stores.xlsx', bytes, 'stores', template('stores'))
    expect(sheet.rows[0]!.cells.slice(4, 6)).toEqual(['-8.5069', '115.2625'])
    expect(sheet.rows[0]!.cells.slice(9, 11)).toEqual(['yes', 'no'])
  })

  it('refuses a header that is not the template, naming the column', async () => {
    const error = await refusal(
      read(
        makeXlsx([
          ['store', 'sku', 'qty'],
          ['A', 'B', 1],
        ]),
      ),
    )
    expect(error.message).toMatch(/store_code/)
  })

  it('refuses macros and links to other workbooks before parsing', async () => {
    const macro = makeXlsx([HEADER], { extraParts: { 'xl/vbaProject.bin': 'x' } })
    expect((await refusal(read(macro))).message).toMatch(/macros/)
    const linked = makeXlsx([HEADER], {
      extraParts: { 'xl/externalLinks/externalLink1.xml': '<externalLink/>' },
    })
    expect((await refusal(read(linked))).message).toMatch(/other workbooks/)
  })

  it('refuses a part that would inflate past the cap (a ZIP bomb)', async () => {
    const bomb = zip({ 'xl/worksheets/sheet1.xml': new Uint8Array(MAX_XML_BYTES + 1024) })
    expect(() => checkWorkbookEnvelope('bomb.xlsx', bomb)).toThrow(ImportError)
    // Small on disk: the cap is on what it unpacks to, not on the upload.
    expect(bomb.length).toBeLessThan(1024 * 1024)
  })

  it('refuses an envelope whose local header disagrees with its table of contents', () => {
    const bytes = zip({ 'xl/workbook.xml': '<workbook/>' })
    const tampered = new Uint8Array(bytes)
    new DataView(tampered.buffer).setUint32(18, 999, true)
    expect(() => checkWorkbookEnvelope('tampered.xlsx', tampered)).toThrow(/disagrees/)
  })

  it('refuses what is not a workbook: text, an old .xls, a damaged stream', async () => {
    await refusal(read(new TextEncoder().encode('store_code,sku\n')))
    const ole = new Uint8Array(4096)
    ole.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    await refusal(read(ole, 'old.xlsx'))
    // A deflated part whose stream is garbage: refused by the envelope check, never parsed.
    const damaged = zip({ 'xl/workbook.xml': '<workbook>' + 'x'.repeat(4000) + '</workbook>' })
    const stream = 30 + 'xl/workbook.xml'.length
    damaged.fill(0xff, stream, stream + 8)
    expect(() => checkWorkbookEnvelope('damaged.xlsx', damaged)).toThrow(ImportError)
  })

  it('is chosen by the file’s name; a .csv still reads as CSV', async () => {
    const csv = new TextEncoder().encode(`${HEADER.join(',')}\nUBD-01,OEI-MUG,,7\n`)
    const sheet = await parseSpreadsheet('stock.csv', csv, 'stock', template('stock'))
    expect(sheet.rows).toHaveLength(1)
  })
})

describe('cellText', () => {
  it('writes each kind of value as text', () => {
    expect(cellText(null)).toBe('')
    expect(cellText(true)).toBe('yes')
    expect(cellText(new Date('2026-11-09T00:00:00Z'))).toBe('2026-11-09')
    expect(cellText('a\u0007b')).toBe('ab')
    expect(cellText('185000')).toBe('185000')
  })
})
