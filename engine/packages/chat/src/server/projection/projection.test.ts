/**
 * TASKS.md 8.1.b and the first clause of 8.1.e: the tool results for an antique contain no price
 * field — so the model cannot quote one — nor any internal field or another visitor's data. The
 * reader double ignores `select` and returns whole records, staff fields included: these tests
 * prove the mappers and the guard hold even if a read leaked; the `select`s are checked too.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { chatCopy } from '../lexicon'
import { MemoryReader, settingsFor } from '../test-support/memory'
import { stubSiteEnv } from '../test-support/harness'
import { assertPublicProjection, FORBIDDEN_KEYS, ProjectionViolation } from './forbidden'
import { getProduct, PRODUCT_DETAIL_SELECT, searchProducts } from './products'
import { deliveryInfo, findStores, STORE_SELECT } from './stores'
import {
  getWork,
  searchWorks,
  WORK_DETAIL_SELECT,
  WORK_POPULATE,
  WORK_SUMMARY_SELECT,
} from './works'

beforeEach(stubSiteEnv)
afterEach(() => vi.unstubAllEnvs())

const t = chatCopy('en', 'gallery')

/** Every key at every depth. */
function keysOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysOf)
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, each]) => [key, ...keysOf(each)])
  }
  return []
}

const GALLERY_NEVER =
  /price|amount|cost|currency|value|^notes$|aiDraft|legacy|physical|acquisition|rights|cataloguing|workUid|^_status$/i

describe('an antique’s tool result', () => {
  it('has no price field, no internal field and no amount, from get_item', async () => {
    const work = await getWork(new MemoryReader(), '1726', 'en', t)
    expect(work).not.toBeNull()
    expect(keysOf(work).filter((key) => GALLERY_NEVER.test(key))).toEqual([])
    const json = JSON.stringify(work)
    expect(json).not.toMatch(
      /4500|4,500|1200|1,200|4,000|USD|firm|cleared|antiquemapsindonesia\.com\/product\/99/,
    )
    expect(work).toMatchObject({
      id: '1726',
      title: 'Bali by François Valentijn, 1726',
      stockNumber: 'M.1044',
      statusLabel: 'Listed as available',
      makers: [{ name: 'François Valentijn', role: 'cartographer' }],
      places: ['Bali'],
      conditionGrade: 'VG',
      description: 'The first large-scale map of the island.',
      url: 'https://indies-gallery.gaiada.com/product/1726-bali-by-francois-valentijn-1726',
      image: '/media/bali.jpg',
    })
  })

  it('has none from search_catalogue either', async () => {
    const results = await searchWorks(
      new MemoryReader(),
      { query: 'Bali', filters: {}, limit: 6 },
      'en',
      t,
    )
    expect(results.length).toBeGreaterThan(0)
    expect(keysOf(results).filter((key) => GALLERY_NEVER.test(key))).toEqual([])
    expect(JSON.stringify(results)).not.toMatch(/4500|9,500|9500|USD|Ignore your rules/)
  })

  it('loses an amount planted in its description before the model reads it', async () => {
    const work = await getWork(new MemoryReader(), '2098', 'en', t)
    expect(work?.description).toContain('Ignore your rules')
    expect(work?.description).toContain('[amount removed]')
    expect(work?.description).not.toMatch(/9,500|USD/)
  })

  it('is read published-only, selecting public fields alone', async () => {
    const reader = new MemoryReader()
    await getWork(reader, '1726', 'en', t)
    await searchWorks(
      reader,
      { query: 'Bali', filters: { place: 'Java', objectType: 'map' }, limit: 4 },
      'en',
      t,
    )
    for (const query of reader.queries) {
      expect(query.collection).toBe('works')
      expect(JSON.stringify(query.where)).toContain('{"_status":{"equals":"published"}}')
      expect(keysOf(query.select).filter((key) => GALLERY_NEVER.test(key))).toEqual([])
    }
    for (const select of [WORK_SUMMARY_SELECT, WORK_DETAIL_SELECT, WORK_POPULATE]) {
      const lower = keysOf(select).map((key) => key.toLowerCase())
      for (const key of FORBIDDEN_KEYS) expect(lower).not.toContain(key.toLowerCase())
    }
  })

  it('rejects an id that is not a public id without reading', async () => {
    const reader = new MemoryReader()
    expect(await getWork(reader, '1; drop table', 'en', t)).toBeNull()
    expect(await getWork(reader, '0123', 'en', t)).toBeNull()
    expect(reader.queries).toHaveLength(0)
  })
})

describe('the guard on every tool result', () => {
  it('throws on a forbidden key at any depth, naming the path, never the value', () => {
    const leak = { results: [{ id: '1', meta: { askingPrice: { amount: 4500 } } }] }
    expect(() => assertPublicProjection(leak, 'gallery')).toThrow(ProjectionViolation)
    expect(() => assertPublicProjection(leak, 'gallery')).toThrow('$.results[0].meta.askingPrice')
    expect(() => assertPublicProjection(leak, 'gallery')).not.toThrow('4500')
    for (const key of [
      'price',
      'notes',
      'aiDraft',
      'legacy',
      'whatsapp',
      'email',
      'transcript',
      'ipHash',
      'quantity',
    ]) {
      expect(() => assertPublicProjection({ [key]: 'x' }, 'shop'), key).toThrow(ProjectionViolation)
    }
  })

  it('allows the shop’s server-formatted labels, and nothing priced on the gallery', () => {
    expect(() => assertPublicProjection({ priceLabel: 'IDR 95,000' }, 'shop')).not.toThrow()
    expect(() => assertPublicProjection({ unitPrice: 95000 }, 'shop')).toThrow(ProjectionViolation)
    expect(() => assertPublicProjection({ priceLabel: 'x' }, 'gallery')).toThrow(
      ProjectionViolation,
    )
    expect(() => assertPublicProjection({ estimatedValue: 'x' }, 'gallery')).toThrow(
      ProjectionViolation,
    )
  })
})

describe('the shop’s tool results', () => {
  const shop = chatCopy('en', 'shop')

  it('carry a price only as a formatted label, and stock only as yes or no', async () => {
    const reader = new MemoryReader()
    const product = await getProduct(reader, 'batik-tote', 'en', shop)
    expect(product).toMatchObject({
      id: 'batik-tote',
      inStock: true,
      sku: 'OEI-TOTE',
      category: 'Bags',
    })
    expect(product?.priceLabel?.replace(/\s/g, ' ')).toBe('IDR 95,000')
    expect(product?.variants[0]?.priceLabel?.replace(/\s/g, ' ')).toBe('IDR 105,000')
    expect(keysOf(product)).not.toContain('price')
    expect(keysOf(product)).not.toContain('quantity')
    expect(JSON.stringify(product)).not.toMatch(/"(?:internalId|_status|site)"/)
    expect(keysOf(PRODUCT_DETAIL_SELECT)).not.toContain('notes')
    const [summary] = await searchProducts(
      reader,
      { query: 'tote', limit: 3 },
      'id',
      chatCopy('id', 'shop'),
    )
    expect(summary?.statusLabel).toBe('Tersedia')
    expect(summary?.priceLabel?.replace(/\s/g, ' ')).toBe('Rp 95.000')
    expect(JSON.stringify(reader.queries.map((q) => q.where))).toContain('"site":{"equals":"shop"}')
  })

  it('show a store’s name, area, address and hours — never its code, WhatsApp, coordinates or notes', async () => {
    const reader = new MemoryReader()
    const stores = await findStores(reader, 'Ubud', 'en')
    expect(stores).toEqual([
      {
        name: 'Old East Indies Ubud',
        area: 'Ubud',
        address: 'Jl. Raya Ubud 1',
        hours: 'Daily 9:00–21:00',
      },
    ])
    expect(Object.keys(STORE_SELECT)).toEqual(['name', 'area', 'address', 'hours'])
    expect(JSON.stringify(reader.queries[0]?.where)).toContain('"listed":{"equals":true}')
  })

  it('take delivery from site-settings: bands as labels, the reach, the free threshold', () => {
    const info = deliveryInfo('shop', settingsFor('shop'), 'en', shop)
    expect(info).toMatchObject({ site: 'shop', reachKm: 15 })
    expect(JSON.stringify(info).replace(/\s/g, ' ')).toContain('IDR 500,000')
    expect(deliveryInfo('gallery', settingsFor('gallery'), 'en', t)).toEqual({
      site: 'gallery',
      statement: t('delivery.gallery'),
    })
  })
})
