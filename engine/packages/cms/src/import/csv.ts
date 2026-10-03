/**
 * A CSV file in, typed rows out (DATA.md §3 "The file"): `.csv`, UTF-8 with a byte-order mark
 * allowed, `,` or `;` sniffed from the header, at most 10 MB and 20,000 data rows, the header in
 * row 1 spelled as the template. A file that is not UTF-8 is refused with its fix — never read in
 * a guessed encoding. XLSX is not supported: `xlsx`/`exceljs` is no dependency of this repo, so a
 * spreadsheet is saved as CSV UTF-8 (reported to the owner as the follow-up that adds it).
 */
import { readFileSync } from 'node:fs'

import { template } from './kinds'
import type { ImportKind } from './types'

export const MAX_BYTES = 10 * 1024 * 1024
export const MAX_DATA_ROWS = 20_000

export class ImportError extends Error {
  readonly fix?: string
  constructor(message: string, fix?: string) {
    super(message)
    this.fix = fix
  }
}

/** A parsed sheet: the header as written, each data row with its line number. */
export type Sheet = {
  readonly header: readonly string[]
  readonly rows: ReadonlyArray<{ readonly row: number; readonly cells: readonly string[] }>
}

const stripBom = (text: string) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)

/** Removes control characters other than tab, newline and carriage return (SECURITY.md §2.7). */
export const cleanControl = (value: string) =>
  value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

/**
 * Reads a UTF-8 CSV: refused with its fix when the bytes are not valid UTF-8 (most office
 * software writes a "Windows" file when it says CSV). Returns the sheet or throws `ImportError`.
 */
export function parseCsv(
  name: string,
  bytes: Uint8Array,
  kind: ImportKind,
  expectedHeader: readonly string[],
): Sheet {
  if (bytes.length > MAX_BYTES) {
    throw new ImportError(
      `${name} is ${(bytes.length / (1024 * 1024)).toFixed(1)} MB — over the 10 MB limit.`,
      'Save it as several smaller files, or drop rows you do not need yet.',
    )
  }
  let text
  try {
    text = stripBom(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new ImportError(
      `${name} is not UTF-8 (often "Windows-1252", saved by older software).`,
      'Save it again as "CSV UTF-8" and upload that.',
    )
  }
  if (text.includes('\0')) {
    throw new ImportError(
      `${name} holds NUL bytes — it is not a CSV text file.`,
      'If it is an Excel workbook, save the sheet as "CSV UTF-8" (.csv) and upload that.',
    )
  }
  const delimiter = sniffDelimiter(text)
  const lines = splitRecords(text, delimiter)
  if (lines.length === 0) throw new ImportError(`${name} is empty.`, 'Export the sheet again.')
  const header = lines[0]!.cells
  const headerError = headerErrorFor(header, kind, expectedHeader)
  if (headerError) {
    throw new ImportError(
      `${name}'s first row is not the ${kind} template: ${headerError}`,
      'Use the template columns exactly as they are spelled (docs/CONTENT-MODEL.md §9).',
    )
  }
  if (lines.length - 1 > MAX_DATA_ROWS) {
    throw new ImportError(
      `${name} holds ${lines.length - 1} rows — over the ${MAX_DATA_ROWS.toLocaleString()} limit.`,
      'Split it into several files.',
    )
  }
  return { header, rows: lines.slice(1) }
}

export function readCsv(
  path: string,
  kind: ImportKind,
  expectedHeader: readonly string[],
): Sheet {
  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(readFileSync(path))
  } catch {
    throw new ImportError(`Could not read ${path}.`, 'Check the path.')
  }
  return parseCsv(path, bytes, kind, expectedHeader)
}

const CANDIDATES = [',', ';'] as const

/** `,` or `;`, from whichever the header holds more of (DATA.md: sniffed from the header). */
function sniffDelimiter(text: string): ',' | ';' {
  const first = text.split(/\r?\n/, 1)[0] ?? ''
  let best: ',' | ';' = ','
  let count = -1
  for (const candidate of CANDIDATES) {
    const n = first.split(candidate).length - 1
    if (n > count) {
      count = n
      best = candidate
    }
  }
  return count <= 0 ? ',' : best
}

/**
 * RFC 4180 records: a quoted cell may hold the delimiter, quotes (doubled) and newlines. Each
 * record keeps the line number its first cell sits on — 1 for the header — because the report
 * names it (DATA.md §4).
 */
function splitRecords(text: string, delimiter: string): Array<{ row: number; cells: string[] }> {
  const rows: Array<{ row: number; cells: string[] }> = []
  let cells: string[] = []
  let cell = ''
  let quoted = false
  let line = 1
  let i = 0
  const push = () => {
    cells.push(cleanControl(cell))
    cell = ''
  }
  while (i < text.length) {
    const char = text[i]!
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        quoted = false
        i += 1
        continue
      }
      cell += char
      i += 1
      continue
    }
    if (char === '"' && cell === '') {
      quoted = true
      i += 1
      continue
    }
    if (char === delimiter) {
      push()
      i += 1
      continue
    }
    if (char === '\r') {
      i += 1
      continue
    }
    if (char === '\n') {
      push()
      rows.push({ row: line, cells })
      cells = []
      line += 1
      i += 1
      continue
    }
    cell += char
    i += 1
  }
  if (quoted) throw new ImportError('A quoted cell never closes — check the quotes in the file.')
  if (cell !== '' || cells.length > 0) {
    push()
    rows.push({ row: line, cells })
  }
  return rows.filter((row) => row.cells.some((cell) => cell.trim() !== ''))
}

/** A one-line answer for a header that does not match the template: the first wrong column. */
export function headerErrorFor(
  header: readonly string[],
  kind: ImportKind,
  expected: readonly string[],
): string | null {
  const missing = expected.filter((name) => !header.includes(name))
  if (missing.length > 0) {
    return `the required column${missing.length > 1 ? 's' : ''} ${missing.join(', ')} ${
      missing.length > 1 ? 'are' : 'is'
    } missing.`
  }
  const known = new Set(knownColumns(kind))
  const unknown = header.filter((name) => !known.has(name))
  if (unknown.length > 0) {
    return `the column${unknown.length > 1 ? 's are' : ' is'} not in the template: ${unknown.join(', ')}.`
  }
  return null
}

/** Every column the kind may carry: the template's own, plus the ones another template repeats. */
const EXTRA: Record<ImportKind, readonly string[]> = {
  antiques: [],
  products: [],
  stores: ['public'],
  stock: ['variant_sku'],
  discounts: [],
}

function knownColumns(kind: ImportKind): readonly string[] {
  return template(kind).concat(EXTRA[kind])
}
