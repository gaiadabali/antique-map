/**
 * A real `.xlsx` for the tests (TASKS.md 27.4.c), written with Node's own zlib — no spreadsheet
 * writer is a dependency. The parts are the minimum Excel itself reads back: content types, the
 * workbook and its relations, styles, shared strings and one sheet per entry of `sheets`. A cell
 * is a string (a shared string), a number, a boolean, `null` (left out) or a formula with the
 * result Excel would have stored (`{ f, v }`). `extraParts` adds parts as they are (a macro, a
 * link to another workbook) for the refusals.
 */
import { crc32, deflateRawSync } from 'node:zlib'

export type TestCell = string | number | boolean | null | { f: string; v: number | string }

const esc = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const column = (index: number): string => {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  }
  return name
}

function sheetXml(rows: ReadonlyArray<ReadonlyArray<TestCell>>, strings: string[]): string {
  const index = (text: string) => {
    const at = strings.indexOf(text)
    if (at >= 0) return at
    strings.push(text)
    return strings.length - 1
  }
  const body = rows
    .map((cells, r) => {
      const xml = cells
        .map((cell, c) => {
          const ref = `${column(c)}${r + 1}`
          if (cell === null) return ''
          if (typeof cell === 'string') return `<c r="${ref}" t="s"><v>${index(cell)}</v></c>`
          if (typeof cell === 'boolean') return `<c r="${ref}" t="b"><v>${cell ? 1 : 0}</v></c>`
          if (typeof cell === 'number') return `<c r="${ref}"><v>${cell}</v></c>`
          const type = typeof cell.v === 'string' ? ' t="str"' : ''
          return `<c r="${ref}"${type}><f>${esc(cell.f)}</f><v>${esc(String(cell.v))}</v></c>`
        })
        .join('')
      return `<row r="${r + 1}">${xml}</row>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`
}

/** A ZIP of `parts`, deflated, as a spreadsheet application writes it. */
export function zip(parts: Record<string, string | Uint8Array>): Uint8Array {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const [name, content] of Object.entries(parts)) {
    const raw = typeof content === 'string' ? Buffer.from(content, 'utf8') : Buffer.from(content)
    const data = deflateRawSync(raw)
    const nameBytes = Buffer.from(name, 'utf8')
    const crc = crc32(raw)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(nameBytes.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, nameBytes, data)
    centrals.push(central, nameBytes)
    offset += local.length + nameBytes.length + data.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(Object.keys(parts).length, 8)
  end.writeUInt16LE(Object.keys(parts).length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return new Uint8Array(Buffer.concat([...locals, directory, end]))
}

/** A workbook whose first sheet holds `rows` (and further sheets, `more`). */
export function makeXlsx(
  rows: ReadonlyArray<ReadonlyArray<TestCell>>,
  options: {
    more?: ReadonlyArray<ReadonlyArray<ReadonlyArray<TestCell>>>
    extraParts?: Record<string, string>
  } = {},
): Uint8Array {
  const sheets = [rows, ...(options.more ?? [])]
  const strings: string[] = []
  const sheetParts = Object.fromEntries(
    sheets.map((sheet, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(sheet, strings)]),
  )
  const ns = 'http://schemas.openxmlformats.org'
  const sheetList = sheets
    .map((_, i) => `<sheet name="Sheet${i + 1}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('')
  const sheetRels = sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="${ns}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join('')
  const n = sheets.length
  return zip({
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="${ns}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships"><sheets>${sheetList}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${ns}/package/2006/relationships">${sheetRels}<Relationship Id="rId${n + 1}" Type="${ns}/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId${n + 2}" Type="${ns}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="${ns}/spreadsheetml/2006/main"><cellXfs count="1"><xf numFmtId="0"/></cellXfs></styleSheet>`,
    ...sheetParts,
    'xl/sharedStrings.xml': `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="${ns}/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${strings.map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`,
    ...(options.extraParts ?? {}),
  })
}
