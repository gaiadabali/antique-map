/**
 * The shop-catalogue layer's pure builders (task 10.6.e), against a small invented fixture (never
 * the owner's data): one product and two variants per design, names with exact, circa, decade and
 * no year, the category priority, integer placeholder prices, deterministic stock, the retire
 * list, and the Instagram pictures ordered artwork-first with mock-up provenance.
 */
import { describe, expect, it } from 'vitest'

import { SKU_PATTERN } from '../../collections/products/skus'
import { PRODUCT_COLUMNS, STOCK_COLUMNS } from '../../import/kinds'
import { parseCsv } from '../../import/csv'
import { categorySeeds, subjectSeeds } from '../vocabulary/seed'
import { buildCatalogue } from './build'
import { categoryOf, productName } from './naming'
import { mockProductSkus, mockStoreCodes } from './read'
import { csvOf, productRows, stockFiles, stockRows } from './rows'
import { PLACEHOLDER_PRICE_IDR, type DesignRecord, type InstagramRecord } from './types'

const dirs = { designs: '/data/designs', instagram: '/data/instagram' }

const design = (over: Partial<DesignRecord> & { code: string }): DesignRecord => ({
  title: 'Map of Bali Island',
  heading: 'Map of Bali Island ~ Year 1849',
  date: { display: '1849', precision: 'exact', year: 1849 },
  artist: null,
  catalogues: ['Maps'],
  description_en: 'First paragraph.\r\n\r\nSecond paragraph.',
  name_id: 'Peta Pulau Bali',
  description_id: 'Paragraf pertama.\n\nParagraf kedua.',
  image: { file: `images/${over.code}.jpg` },
  ...over,
})

const DESIGNS: DesignRecord[] = [
  design({ code: 'MP.001' }),
  design({
    code: 'MP.002',
    title: 'Bali Island Dutch Map',
    date: { display: '1600', precision: 'circa', year: 1600 },
    name_id: 'Peta Belanda Pulau Bali',
    catalogues: ['Bali Island', 'Landscapes', 'Travel Posters'],
  }),
  design({
    code: 'MP.136-2',
    title: 'Jepun Flower',
    date: { display: null, precision: 'none', year: null },
    name_id: 'Bunga Jepun',
    catalogues: ['Bali Island', 'Botanicals'],
  }),
  design({
    code: 'MP.004',
    title: 'Red Bird',
    name_id: 'Burung Merah',
    catalogues: ['Animals', 'Botanicals'],
  }),
]

const INSTAGRAM: InstagramRecord[] = [
  {
    id: 'IG-Dcu3iFkgd_W',
    title: 'Lombok Turtle Snorkling',
    name_en: 'Lombok Turtle Snorkelling',
    name_id: 'Snorkeling Penyu di Lombok',
    date: { display: null, precision: 'none', year: null },
    description_en: 'Turtles.',
    description_id: 'Penyu.',
    images: [
      { file: 'images/a-c0.jpg', kind: 'mockup-mounted' },
      { file: 'images/a-c1.jpg', kind: 'artwork' },
    ],
  },
  {
    id: 'IG-DbqE0irAQLk',
    title: 'Exotic Bali',
    name_id: 'Bali yang Eksotis',
    date: { display: '1930s', precision: 'decade', year: 1930 },
    description_en: 'A dancer.',
    description_id: 'Seorang penari.',
    images: [
      { file: 'images/b-c0.jpg', kind: 'mockup-framed' },
      { file: 'images/b-c1.jpg', kind: 'mockup-mounted' },
      { file: 'images/b-c2.jpg', kind: 'artwork-branded' },
    ],
  },
]

const products = buildCatalogue(DESIGNS, INSTAGRAM, dirs)
const byName = (sku: string) => products.find((product) => product.sku === sku)!

describe('one product and two variants per design', () => {
  it('names the SKUs from the design code, SEED- first, every one a valid SKU', () => {
    expect(products.map((product) => product.sku)).toEqual([
      'SEED-MP.001',
      'SEED-MP.002',
      'SEED-MP.136-2',
      'SEED-MP.004',
      'SEED-IG01',
      'SEED-IG02',
    ])
    for (const product of products) {
      expect(product.variants.map((variant) => variant.sku)).toEqual([
        `${product.sku}-M`,
        `${product.sku}-F`,
      ])
      for (const sku of [product.sku, ...product.variants.map((variant) => variant.sku)]) {
        expect(sku).toMatch(SKU_PATTERN)
        expect(sku.startsWith('SEED-')).toBe(true)
      }
    }
  })

  it('writes a product row then its two variant rows, per design', () => {
    const rows = productRows(products)
    expect(rows).toHaveLength(products.length * 3)
    expect(rows.slice(0, 3).map((row) => [row.sku, row.parent_sku, row.variant_label_en])).toEqual([
      ['SEED-MP.001', '', ''],
      ['SEED-MP.001-M', 'SEED-MP.001', 'Mounted print'],
      ['SEED-MP.001-F', 'SEED-MP.001', 'Framed print'],
    ])
  })

  it('turns blank lines between paragraphs into plain text with LF only', () => {
    expect(byName('SEED-MP.001').descriptionEn).toBe('First paragraph.\n\nSecond paragraph.')
    expect(byName('SEED-MP.001').descriptionId).toBe('Paragraf pertama.\n\nParagraf kedua.')
  })

  it('reads back through the importer as a sheet with the exact template header', () => {
    const csv = csvOf(PRODUCT_COLUMNS, productRows(products))
    const sheet = parseCsv('p.csv', new TextEncoder().encode(csv), 'products', PRODUCT_COLUMNS)
    expect(sheet.rows).toHaveLength(products.length * 3)
    const description = sheet.rows[0]!.cells[PRODUCT_COLUMNS.indexOf('description_en')]
    expect(description).toBe('First paragraph.\n\nSecond paragraph.')
  })
})

describe('names', () => {
  it('adds an exact year bare, a circa year as c. / sekitar, a decade as written', () => {
    expect(byName('SEED-MP.001').nameEn).toBe('Map of Bali Island, 1849')
    expect(byName('SEED-MP.001').nameId).toBe('Peta Pulau Bali, 1849')
    expect(byName('SEED-MP.002').nameEn).toBe('Bali Island Dutch Map, c. 1600')
    expect(byName('SEED-MP.002').nameId).toBe('Peta Belanda Pulau Bali, sekitar 1600')
    expect(byName('SEED-IG02').nameEn).toBe('Exotic Bali, 1930s')
    expect(byName('SEED-IG02').nameId).toBe('Bali yang Eksotis, 1930-an')
  })

  it('leaves the name bare when the heading carries no year', () => {
    expect(byName('SEED-MP.136-2').nameEn).toBe('Jepun Flower')
    expect(byName('SEED-MP.136-2').nameId).toBe('Bunga Jepun')
    expect(productName('Lombok', { display: null, precision: 'none', year: null }, 'en')).toBe(
      'Lombok',
    )
  })

  it('uses the corrected English name of an Instagram design when the record has one', () => {
    expect(byName('SEED-IG01').nameEn).toBe('Lombok Turtle Snorkelling')
  })
})

describe('categories', () => {
  it('takes the first catalogue that applies: Maps, Travel Posters, Animals, Botanicals, Landscapes, Bali Island', () => {
    expect(categoryOf(['Bali Island', 'Maps', 'Travel Posters']).en).toBe('Maps')
    expect(categoryOf(['Bali Island', 'Landscapes', 'Travel Posters']).en).toBe('Travel posters')
    expect(categoryOf(['Botanicals', 'Animals']).en).toBe('Animals')
    expect(categoryOf(['Bali Island', 'Botanicals']).en).toBe('Botanicals')
    expect(categoryOf(['Bali Island', 'Landscapes']).en).toBe('Landscapes')
    expect(categoryOf(['Bali Island']).en).toBe('Bali')
    expect(categoryOf(['Bali Island']).id).toBe('Bali')
  })

  it('puts a multi-catalogue design in one category, and the Instagram designs by their list', () => {
    expect(byName('SEED-MP.002').category.en).toBe('Travel posters')
    expect(byName('SEED-MP.004').category.en).toBe('Animals')
    expect(byName('SEED-IG01').category.en).toBe('Travel posters')
  })

  it('every category the layer names is seeded in both languages and matches no other term', () => {
    const seeded = new Map(categorySeeds().map((seed) => [seed.label, seed.labelId]))
    const used = new Set(products.map((product) => product.category))
    for (const category of used) expect(seeded.get(category.en)).toBe(category.id)
    for (const label of ['Maps', 'Travel posters', 'Bali', 'Animals', 'Botanicals', 'Landscapes']) {
      expect(seeded.has(label)).toBe(true)
      expect(
        subjectSeeds().some((subject) => subject.label.toLowerCase() === label.toLowerCase()),
      ).toBe(false)
    }
  })
})

describe('placeholder prices', () => {
  it('are whole rupiah integers, 450000 mounted and 950000 framed, the same everywhere', () => {
    for (const product of products) {
      expect(product.variants.map((variant) => variant.priceIdr)).toEqual([450_000, 950_000])
      expect(product.priceIdr).toBe(450_000)
      for (const variant of product.variants) expect(Number.isInteger(variant.priceIdr)).toBe(true)
    }
    expect(PLACEHOLDER_PRICE_IDR).toEqual({ mounted: 450_000, framed: 950_000 })
    const prices = productRows(products).map((row) => row.price_idr)
    for (const price of prices) expect(price).toMatch(/^[1-9]\d*$/)
  })
})

describe('stock', () => {
  const stores = ['DPS-001', 'DPS-002', 'UBD-001', 'UBD-002', 'SNR-001']

  it('is the same rows for the same seed and different for another', () => {
    expect(stockRows(products, stores, 7)).toEqual(stockRows(products, stores, 7))
    expect(stockRows(products, stores, 7)).not.toEqual(stockRows(products, stores, 8))
  })

  it('has rows only for new variants in the given stores, with whole non-negative counts', () => {
    const variants = new Set(products.flatMap((product) => product.variants.map((v) => v.sku)))
    const rows = stockRows(products, stores)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(stores).toContain(row.store_code)
      expect(variants.has(row.variant_sku!)).toBe(true)
      expect(row.quantity).toMatch(/^\d+$/)
      expect(row.sku).toBe(row.variant_sku!.replace(/-[MF]$/, ''))
    }
  })

  it('leaves a handful of variants out of stock everywhere, with explicit zero rows', () => {
    const rows = stockRows(products, stores)
    const held = new Set(
      rows.filter((row) => Number(row.quantity) > 0).map((row) => row.variant_sku),
    )
    const zero = new Set(rows.filter((row) => row.quantity === '0').map((row) => row.variant_sku))
    expect(zero.size).toBeGreaterThan(0)
    for (const sku of zero) expect(held.has(sku)).toBe(false)
  })

  it('is split into files under the importer row limit, each with the stock header', () => {
    const rows = stockRows(products, stores)
    const files = stockFiles(rows, 5)
    expect(files.length).toBe(Math.ceil(rows.length / 5))
    for (const file of files) {
      const sheet = parseCsv('s.csv', new TextEncoder().encode(file), 'stock', STOCK_COLUMNS)
      expect(sheet.rows.length).toBeLessThanOrEqual(5)
    }
  })
})

describe('the mock products that retire', () => {
  it('are the 80 product rows of the committed mock, none of the variants', () => {
    const skus = mockProductSkus()
    expect(skus).toHaveLength(80)
    expect(skus.every((sku) => sku.startsWith('SEED-SHOP-') && !/-\d$/.test(sku))).toBe(true)
  })

  it('never include a SKU of this layer', () => {
    const mine = new Set(products.map((product) => product.sku))
    for (const sku of mockProductSkus()) expect(mine.has(sku)).toBe(false)
  })

  it('stock goes to the 120 mock stores', () => {
    expect(mockStoreCodes()).toHaveLength(120)
  })
})

describe('pictures', () => {
  it('puts a catalogue design artwork first as the unlabelled reproduction', () => {
    const [image] = byName('SEED-MP.001').images
    expect(byName('SEED-MP.001').images).toHaveLength(1)
    expect(image!.path.replaceAll('\\', '/')).toBe('/data/designs/images/MP.001.jpg')
    expect(image!.fileName).toBe('MP.001.jpg')
    expect([image!.role, image!.provenance]).toEqual(['flat', 'photograph'])
  })

  it('orders an Instagram design artwork first, then its mock-ups in file order', () => {
    expect(byName('SEED-IG01').images.map((image) => image.fileName)).toEqual([
      'a-c1.jpg',
      'a-c0.jpg',
    ])
    expect(byName('SEED-IG02').images.map((image) => image.fileName)).toEqual([
      'b-c2.jpg',
      'b-c0.jpg',
      'b-c1.jpg',
    ])
  })

  it('marks every mock-up rendered (labelled where shown) and an edited crop composite', () => {
    const lombok = byName('SEED-IG01').images
    expect([lombok[0]!.role, lombok[0]!.provenance]).toEqual(['flat', 'photograph'])
    expect([lombok[1]!.role, lombok[1]!.provenance]).toEqual(['flat', 'rendered'])
    const exotic = byName('SEED-IG02').images
    expect([exotic[0]!.kind, exotic[0]!.provenance]).toEqual(['artwork-branded', 'composite'])
    expect([exotic[1]!.role, exotic[1]!.provenance]).toEqual(['in-room', 'rendered'])
    expect([exotic[2]!.role, exotic[2]!.provenance]).toEqual(['flat', 'rendered'])
  })

  it('gives every picture an alt text in both languages', () => {
    for (const product of products) {
      for (const image of product.images) {
        expect(image.altEn.startsWith(product.nameEn)).toBe(true)
        expect(image.altId.startsWith(product.nameId)).toBe(true)
      }
    }
  })
})
