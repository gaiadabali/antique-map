// RFC 4180 CSV, read and written without a dependency: Search Console's
// exports quote any field holding a comma ("1,234" clicks, a URL with a
// comma), may start with a byte-order mark, and end lines with CRLF.

/**
 * @param {string} text
 * @returns {string[][]} rows of fields; blank lines are dropped
 */
export function parseCsv(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  /** @type {string[][]} */
  const rows = []
  /** @type {string[]} */
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (quoted) throw new Error('CSV ends inside a quoted field')
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((fields) => fields.some((value) => value.trim() !== ''))
}

/** @param {string | number} value */
function quote(value) {
  const text = String(value)
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * @param {string[]} header
 * @param {Array<Record<string, string | number>>} records
 * @returns {string} LF line endings (the repo forces LF), one trailing newline
 */
export function toCsv(header, records) {
  const lines = [header.map(quote).join(',')]
  for (const record of records)
    lines.push(header.map((name) => quote(record[name] ?? '')).join(','))
  return `${lines.join('\n')}\n`
}

/**
 * The inverse of `toCsv`: rows as records keyed by the header.
 * @param {string} text
 * @returns {Array<Record<string, string>>}
 */
export function readCsvRecords(text) {
  const [header, ...rows] = parseCsv(text)
  if (header === undefined) return []
  return rows.map((fields) => Object.fromEntries(header.map((name, i) => [name, fields[i] ?? ''])))
}
