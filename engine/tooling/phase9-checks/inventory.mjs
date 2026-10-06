// The legacy URL inventories (DATA.md §6–§7): the gallery's 7,665 paths in a TSV and the shop's
// 673 in a CSV. Only the address itself matters to the check, so each reader returns the inventory's
// `path` column, in file order — the old address a browser (and the redirect gate) would request.
import { readFileSync } from 'node:fs'

export const INVENTORY = {
  gallery: 'engine/packages/migrate/data/gallery/inventory/urls.tsv',
  shop: 'engine/packages/migrate/data/shop/inventory/urls.csv',
}

/** One inventory row: the old address and the status the collector recorded for it. */
export function row(path, status) {
  return { path, status: status ?? '' }
}

/** The gallery's TSV: header `path\tkind\tstatus\tlocation`, then one path per line. */
export function readGalleryRows(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  const [header, ...rows] = lines
  if (!header || !header.startsWith('path')) throw new Error('unexpected header in the gallery TSV')
  return rows
    .map((line) => line.split('\t'))
    .filter((fields) => (fields[0] ?? '') !== '')
    .map((fields) => row(fields[0], fields[2]))
}

/** The shop's CSV: a BOM-able header, quoted fields possible, `path` a named column. */
export function readShopRows(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const [header, ...records] = parseCsv(source)
  if (!header) return []
  const pathAt = header.indexOf('path')
  if (pathAt === -1) throw new Error('no "path" column in the shop CSV')
  const statusAt = header.indexOf('status')
  return records
    .filter((fields) => (fields[pathAt] ?? '') !== '')
    .map((fields) => row(fields[pathAt], fields[statusAt]))
}

/** Loads one site's rows from its committed inventory, in file order. */
export function readInventory(site, root) {
  const rel = INVENTORY[site]
  if (!rel) throw new Error(`unknown site ${site}`)
  const text = readFileSync(`${root}/${rel}`, 'utf8')
  return site === 'gallery' ? readGalleryRows(text) : readShopRows(text)
}

/** RFC 4180 rows, enough for the shop's file: quotes, doubled quotes, CRLF, trailing blank lines. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((fields) => fields.some((value) => value.trim() !== ''))
}
