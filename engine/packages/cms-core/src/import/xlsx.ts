/**
 * An Excel workbook in, the same typed rows a CSV gives out (DATA.md §3 "The file"; TASKS.md
 * 27.4.c): `.xlsx` means the **first sheet**, cell values only — a formula counts by the result
 * Excel stored with it and is never evaluated; macros and links to other workbooks are refused
 * (`./zip-guard`). The limits are the CSV's: 10 MB, 20,000 data rows, the header in row 1 spelled
 * as the template. From there a sheet is a sheet: planning, validation and the report are shared.
 *
 * The parser is `read-excel-file` (`/node`), pinned: values only, no formula engine, no writer.
 * Numbers are kept as the text the workbook stores (`parseNumber`), so `-8.5069` and `185000`
 * reach the cell readers exactly as a CSV would carry them; a yes/no cell becomes `yes`/`no`, a
 * date `YYYY-MM-DD`. Row numbers are the sheet's own, so the report names the row Excel shows.
 */
import { InvalidInputError, readSheet } from 'read-excel-file/node'

import {
  cleanControl,
  headerErrorFor,
  ImportError,
  MAX_BYTES,
  MAX_DATA_ROWS,
  parseCsv,
} from './csv'
import type { Sheet } from './csv'
import type { ImportKind } from './types'
import { checkWorkbookEnvelope } from './zip-guard'

const isXlsxName = (name: string) => /\.xlsx$/i.test(name)

/** One cell as the CSV would have carried it. */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const iso = value.toISOString()
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso
  }
  return cleanControl(String(value))
}

/** The reader's own refusals, in the import's words. */
function refusal(name: string, error: unknown): ImportError {
  const code = (error as { code?: string } | null)?.code
  if (error instanceof InvalidInputError && code === 'XLS_FILE_NOT_SUPPORTED') {
    return new ImportError(
      `${name} is an old-style Excel file (.xls) or a password-protected workbook.`,
      'Save it as an Excel workbook (.xlsx) without a password, or as CSV UTF-8.',
    )
  }
  return new ImportError(
    `${name} could not be read as an Excel workbook.`,
    'Open it in Excel or Sheets and save it again as .xlsx, or as CSV UTF-8.',
  )
}

/** Reads the first sheet of an `.xlsx`; throws `ImportError` with its fix. */
export async function parseXlsx(
  name: string,
  bytes: Uint8Array,
  kind: ImportKind,
  expectedHeader: readonly string[],
): Promise<Sheet> {
  if (bytes.length > MAX_BYTES) {
    throw new ImportError(
      `${name} is ${(bytes.length / (1024 * 1024)).toFixed(1)} MB — over the 10 MB limit.`,
      'Save it as several smaller files, or drop rows you do not need yet.',
    )
  }
  checkWorkbookEnvelope(name, bytes)
  let data: ReadonlyArray<ReadonlyArray<unknown>>
  try {
    const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length)
    data = await readSheet<string>(buffer, 1, { parseNumber: (text: string) => text })
  } catch (error) {
    throw refusal(name, error)
  }
  if (data.length === 0)
    throw new ImportError(`${name}'s first sheet is empty.`, 'Export it again.')
  const header = (data[0] ?? []).map((cell) => cellText(cell).trim())
  // Columns past the template's, left empty in every row, are not columns (Excel's own formatting).
  while (header.length > 0 && header[header.length - 1] === '') header.pop()
  const headerError = headerErrorFor(header, kind, expectedHeader)
  if (headerError) {
    throw new ImportError(
      `${name}'s first row is not the ${kind} template: ${headerError}`,
      'Use the template columns exactly as they are spelled (docs/CONTENT-MODEL.md §9), on the first sheet.',
    )
  }
  const rows: Array<{ row: number; cells: string[] }> = []
  for (let i = 1; i < data.length; i += 1) {
    const cells = (data[i] ?? []).slice(0, header.length).map(cellText)
    if (cells.every((cell) => cell.trim() === '')) continue
    rows.push({ row: i + 1, cells })
  }
  if (rows.length > MAX_DATA_ROWS) {
    throw new ImportError(
      `${name} holds ${rows.length} rows — over the ${MAX_DATA_ROWS.toLocaleString()} limit.`,
      'Split it into several files.',
    )
  }
  return { header, rows }
}

/** A spreadsheet by its name: `.xlsx` is read as a workbook, anything else as a CSV. */
export async function parseSpreadsheet(
  name: string,
  bytes: Uint8Array,
  kind: ImportKind,
  expectedHeader: readonly string[],
): Promise<Sheet> {
  return isXlsxName(name)
    ? parseXlsx(name, bytes, kind, expectedHeader)
    : parseCsv(name, bytes, kind, expectedHeader)
}
