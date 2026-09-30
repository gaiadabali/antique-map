// Every committed legacy URL inventory this tool wrote — any brand folder with
// `content/legacy/discovery.json` — is well-formed and carries nothing
// personal. Brands are found on disk; none is named here (CONVENTIONS.md §1).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, URLSearchParams } from 'node:url'

import { describe, expect, it } from 'vitest'

import { KINDS } from './classify-path.mjs'
import { parseCsv } from './csv.mjs'
import { INVENTORY_COLUMNS } from './inventory.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../..')
const brands = readdirSync(REPO, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
  .map((entry) => join(REPO, entry.name, 'content', 'legacy'))
  .filter((dir) => existsSync(join(dir, 'discovery.json')))

describe('committed legacy URL inventories', () => {
  it('exist for at least one brand', () => {
    expect(brands.length).toBeGreaterThan(0)
  })

  for (const dir of brands) {
    const label = dir.slice(REPO.length + 1).split(/[\\/]/)[0]
    it(`${label}: every row is distinct, sorted, classified and sourced`, () => {
      const [header, ...rows] = parseCsv(readFileSync(join(dir, 'inventory', 'urls.csv'), 'utf8'))
      expect(header).toEqual(INVENTORY_COLUMNS)
      const at = (/** @type {string} */ column) => INVENTORY_COLUMNS.indexOf(column)
      const ids = rows.map((row) => `${row[at('host')]} ${row[at('path')]}`)
      expect(new Set(ids).size).toBe(ids.length)
      const order = (/** @type {string} */ id) => (id.startsWith('@ ') ? `0${id}` : `1${id}`)
      expect(ids).toEqual([...ids].sort((a, b) => (order(a) < order(b) ? -1 : 1)))
      for (const row of rows) {
        expect(row).toHaveLength(INVENTORY_COLUMNS.length)
        expect(KINDS).toContain(row[at('kind')])
        expect(row[at('path')]).toMatch(/^\/(?![/\\])/) // root-relative, never //host
        expect(['cdx', 'gsc', 'cdx|gsc']).toContain(row[at('sources')])
      }
      const summary = JSON.parse(readFileSync(join(dir, 'inventory', 'summary.json'), 'utf8'))
      expect(summary.total).toBe(rows.length)
      const byKind = Object.fromEntries(KINDS.map((kind) => [kind, 0]))
      rows.forEach((row) => (byKind[row[at('kind')] ?? ''] += 1))
      expect(summary.byKind).toEqual(byKind)
    })

    it(`${label}: nothing personal — no address, no token, no query but a filter`, () => {
      const text = readFileSync(join(dir, 'inventory', 'urls.csv'), 'utf8')
      expect(text).not.toMatch(/@[^,\s]*\.[a-z]{2,}|%40/i)
      const paths = parseCsv(text)
        .slice(1)
        .map((row) => row[INVENTORY_COLUMNS.indexOf('path')] ?? '')
      for (const path of paths.filter((p) => p.includes('?'))) {
        const keys = [...new URLSearchParams(path.split('?')[1]).keys()]
        expect(keys.every((key) => key === 'category' || key === 'tag')).toBe(true)
      }
    })
  }
})
