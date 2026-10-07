/**
 * The redirect loader without a database (9.4load): the diff, the plan, the batches and the
 * transactions, against an in-memory stand-in for Payload. The same behaviour on a real Postgres
 * is `load.db.test.ts`.
 */
import { describe, expect, it } from 'vitest'

import type { RedirectRow } from '../build'
import { chunk, isUnchanged, loadRedirects, planLoad, type ExistingRow } from '../load'
import type { WorkLookup } from '../rules'
import { fakePayload } from './fake-payload.test-support'

const works: WorkLookup[] = [
  { legacyId: 1, publicId: 1001, slug: 'bali', published: true },
  { legacyId: 2, publicId: 1002, slug: 'java', published: true },
  { legacyId: 3, publicId: 1003, slug: 'draft', published: false },
]
const urls = ['/product/1-old', '/product/2-old', '/product/3-old', '/account/basket']

const row = (from: string, to = '/x', code: RedirectRow['code'] = 301): RedirectRow => ({
  site: 'gallery',
  from,
  to,
  code,
  source: 'legacy',
})
const stored = (id: number, r: RedirectRow): ExistingRow => ({
  id,
  to: r.to,
  code: String(r.code) as ExistingRow['code'],
  source: r.source,
})

describe('chunk', () => {
  it('splits into consecutive batches of at most the size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 500)).toEqual([])
    expect(chunk([1, 2], 500)).toEqual([[1, 2]])
  })
  it('refuses a size that is not a positive integer', () => {
    expect(() => chunk([1], 0)).toThrow(RangeError)
    expect(() => chunk([1], 1.5)).toThrow(RangeError)
  })
})

describe('isUnchanged and planLoad', () => {
  it('compares to, code and source, with the code as the stored string', () => {
    expect(isUnchanged(row('/a', '/b'), stored(1, row('/a', '/b')))).toBe(true)
    expect(isUnchanged(row('/a', '/b'), stored(1, row('/a', '/c')))).toBe(false)
    expect(isUnchanged(row('/a', '', 410), stored(1, row('/a', '', 410)))).toBe(true)
    expect(isUnchanged(row('/a', '/b'), { ...stored(1, row('/a', '/b')), source: 'editor' })).toBe(
      false,
    )
  })

  it('creates the missing, updates the changed, counts the identical, and prunes only on request', () => {
    const rows = [row('/new'), row('/same', '/s'), row('/moved', '/m2')]
    const existing = new Map<string, ExistingRow>([
      ['/same', stored(1, row('/same', '/s'))],
      ['/moved', stored(2, row('/moved', '/m1'))],
      ['/stale', stored(3, row('/stale'))],
    ])
    const kept = planLoad(rows, existing, false)
    expect(kept.toCreate.map((r) => r.from)).toEqual(['/new'])
    expect(kept.toUpdate).toEqual([{ id: 2, row: row('/moved', '/m2') }])
    expect(kept.unchanged).toBe(1)
    expect(kept.toPrune).toEqual([])
    expect(planLoad(rows, existing, true).toPrune).toEqual([{ from: '/stale', id: 3 }])
  })
})

describe('loadRedirects', () => {
  const options = { site: 'gallery' as const, urls, works }

  it('loads rows for published works and gone rows for retired addresses', async () => {
    const fake = fakePayload()
    const result = await loadRedirects(fake.payload, options)
    expect(result).toMatchObject({
      rows: 3,
      gone: 1,
      created: 3,
      updated: 0,
      unchanged: 0,
      pruned: 0,
    })
    const rows = [...fake.table.values()].map(({ id: _id, ...rest }) => rest)
    expect(rows).toContainEqual({
      site: 'gallery',
      from: '/product/1-old',
      to: '/product/1001-bali',
      code: '301',
      source: 'legacy',
    })
    expect(rows).toContainEqual({
      site: 'gallery',
      from: '/account/basket',
      to: '',
      code: '410',
      source: 'legacy',
    })
  })

  it("an unpublished work's old URL is unresolved, not a row", async () => {
    const fake = fakePayload()
    const result = await loadRedirects(fake.payload, options)
    expect(result.unresolved).toEqual([
      { from: '/product/3-old', reason: 'work 3 is not published' },
    ])
    expect([...fake.table.values()].some((r) => r.from === '/product/3-old')).toBe(false)
  })

  it('a second run changes nothing', async () => {
    const fake = fakePayload()
    await loadRedirects(fake.payload, options)
    const writes = fake.log.creates + fake.log.updates + fake.log.deletes
    const again = await loadRedirects(fake.payload, options)
    expect(again).toMatchObject({ created: 0, updated: 0, unchanged: 3, pruned: 0 })
    expect(fake.log.creates + fake.log.updates + fake.log.deletes).toBe(writes)
  })

  it('updates a row whose destination changed, and leaves the rest', async () => {
    const fake = fakePayload()
    await loadRedirects(fake.payload, options)
    const moved = works.map((w) => (w.legacyId === 1 ? { ...w, slug: 'bali-renamed' } : w))
    const result = await loadRedirects(fake.payload, { ...options, works: moved })
    expect(result).toMatchObject({ created: 0, updated: 1, unchanged: 2 })
    const first = [...fake.table.values()].find((r) => r.from === '/product/1-old')
    expect(first?.to).toBe('/product/1001-bali-renamed')
  })

  it('a dry run writes nothing', async () => {
    const fake = fakePayload([
      { site: 'gallery', from: '/stale', to: '/z', code: '301', source: 'legacy' },
    ])
    const result = await loadRedirects(fake.payload, { ...options, dryRun: true, prune: true })
    expect(result).toMatchObject({ created: 3, updated: 0, pruned: 1 })
    expect(fake.table.size).toBe(1)
    expect(fake.log).toMatchObject({ begun: 0, creates: 0, updates: 0, deletes: 0 })
  })

  it('prune removes only rows of that site that are no longer produced', async () => {
    const fake = fakePayload([
      { site: 'gallery', from: '/stale', to: '/z', code: '301', source: 'legacy' },
      { site: 'shop', from: '/shop-row', to: '/y', code: '301', source: 'legacy' },
    ])
    const kept = await loadRedirects(fake.payload, options)
    expect(kept.pruned).toBe(0)
    expect(fake.table.size).toBe(5)

    const pruned = await loadRedirects(fake.payload, { ...options, prune: true })
    expect(pruned).toMatchObject({ created: 0, updated: 0, unchanged: 3, pruned: 1 })
    const left = [...fake.table.values()].map((r) => `${r.site}:${r.from}`).sort()
    expect(left).toEqual([
      'gallery:/account/basket',
      'gallery:/product/1-old',
      'gallery:/product/2-old',
      'shop:/shop-row',
    ])
  })

  it('writes in batches of 500, one transaction each', async () => {
    const many = Array.from({ length: 1100 }, (_, i) => ({
      legacyId: i + 1,
      publicId: 2000 + i,
      slug: `w${i}`,
      published: true,
    }))
    const fake = fakePayload()
    const result = await loadRedirects(fake.payload, {
      site: 'gallery',
      urls: many.map((w) => `/product/${w.legacyId}-old`),
      works: many,
    })
    expect(result.created).toBe(1100)
    expect(fake.log.committed).toEqual([500, 500, 100])
    expect(fake.log.rolledBack).toBe(0)
  })

  it('reads the table a page at a time when it is larger than a page', async () => {
    const fake = fakePayload([], [], 2)
    await loadRedirects(fake.payload, options)
    fake.log.finds = 0
    const again = await loadRedirects(fake.payload, options)
    expect(again.unchanged).toBe(3)
    expect(fake.log.finds).toBe(2)
  })

  it('rolls the failing batch back and stops, leaving earlier batches whole', async () => {
    const fake = fakePayload()
    fake.failCreateAt(3)
    await expect(loadRedirects(fake.payload, { ...options, batchSize: 2 })).rejects.toThrow(
      /refused the row/,
    )
    expect(fake.log.committed).toEqual([2])
    expect(fake.log.rolledBack).toBe(1)
  })

  it('refuses a chain before writing anything', async () => {
    const fake = fakePayload()
    await expect(
      loadRedirects(fake.payload, {
        site: 'gallery',
        urls: ['/path/a', '/path/b'],
        works,
        categories: { '/path/a': '/path/b', '/path/b': '/browse/maps' },
      }),
    ).rejects.toThrow(/redirect chain/)
    expect(fake.log).toMatchObject({ begun: 0, creates: 0 })
  })
})
