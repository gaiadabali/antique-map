// The pinned agreement between this tool's key normalisation and the 9.4a builder's (the ticket:
// import the builder's own normaliser, or restate it held to the same answers). Every key the check
// requests must be the string a redirect row's `from` holds.
import { describe, expect, it } from 'vitest'

import { redirectKey as builderKey } from '../../packages/migrate/src/redirects/normalise.ts'
import { collectKeys, keyOf } from './normalise.mjs'
import { readInventory } from './inventory.mjs'

const CASES = [
  ['/', '/'],
  ['/category/7-maps/', '/category/7-maps'],
  ['//category//7-maps//', '/category/7-maps'],
  ['/category/7-maps?page=2&s=sold&o=newest', '/category/7-maps?o=newest&s=sold'],
  ['/product/1706-bali', '/product/1706-bali'],
  ['/category/7-maps?s=&page=2', '/category/7-maps'],
]

describe('keyOf matches the builder', () => {
  it.each(CASES)('%s is keyed as the builder keys it', (path, expected) => {
    const site = 'gallery'
    const at = path.indexOf('?')
    const builder =
      at === -1 ? builderKey(site, path) : builderKey(site, path.slice(0, at), path.slice(at + 1))
    expect(keyOf(site, path)).toBe(builder)
    expect(keyOf(site, path)).toBe(expected)
  })
})

describe('readInventory', () => {
  it('reads the gallery TSV as paths (7,665 rows) in file order', () => {
    const rows = readInventory('gallery', '.')
    expect(rows[0].path).toBe('/')
    expect(rows.length).toBeGreaterThan(7000)
    expect(rows.every((row) => typeof row.path === 'string' && row.path.startsWith('/'))).toBe(true)
  })

  it('reads the shop CSV as paths (673 rows)', () => {
    const rows = readInventory('shop', '.')
    expect(rows[0].path).toBe('/')
    expect(rows.length).toBeGreaterThan(600)
  })
})

describe('collectKeys', () => {
  it('de-duplicates keys that normalise alike, keeping first order', () => {
    const rows = [
      { path: '/category/7-maps' },
      { path: '/category/7-maps/' },
      { path: '/category/7-maps?page=2' },
    ]
    const { keys } = collectKeys('gallery', rows)
    expect(keys).toEqual(['/category/7-maps'])
  })
})
