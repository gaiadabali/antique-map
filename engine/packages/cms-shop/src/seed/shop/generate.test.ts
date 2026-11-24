/**
 * TASKS.md 3.7.c: the shop's mock seed files are deterministic, inside Bali's bounds, priced in whole
 * rupiah on the 5.000 grid, in stock somewhere (except the seeded out-of-stock ones), and carry the exact
 * documented headers (docs/CONTENT-MODEL.md §9, docs/DATA.md §3).
 */
import { describe, expect, it } from 'vitest'

import {
  buildShopFiles,
  DISCOUNT_HEADERS,
  mulberry32,
  PRODUCT_HEADERS,
  SEED,
  STOCK_HEADERS,
  STORE_HEADERS,
} from './generate'

const LAT_MIN = -8.85,
  LAT_MAX = -8.05,
  LNG_MIN = 114.43,
  LNG_MAX = 115.71
const CATEGORIES = ['Prints', 'Map reproductions', 'Textiles', 'Homeware', 'Stationery', 'Gifts']

/** Splits one CSV line, honouring double-quoted fields with doubled quotes (RFC 4180). */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      out.push(field)
      field = ''
    } else field += ch
  }
  out.push(field)
  return out
}

function parse(content: string): { headers: string[]; rows: string[][] } {
  const lines = content
    .replaceAll('\r\n', '\n')
    .split('\n')
    .filter((l) => l !== '')
  return { headers: splitCsvLine(lines[0]!), rows: lines.slice(1).map(splitCsvLine) }
}

const files = new Map(buildShopFiles().map((f) => [f.name, f.content]))
const stores = parse(files.get('stores.csv')!)
const products = parse(files.get('products.csv')!)
const stock = parse(files.get('stock.csv')!)
const discounts = parse(files.get('discounts.csv')!)
const skus = new Set(products.rows.map((r) => r[0]!))
const parentSkus = new Set(products.rows.filter((r) => r[1] === '').map((r) => r[0]!))
const variantToParent = new Map(products.rows.filter((r) => r[1] !== '').map((r) => [r[0]!, r[1]!]))
const hasVariants = new Set([...variantToParent.values()])

describe('shop seed files', () => {
  it('is deterministic — two runs produce identical bytes', () => {
    expect(buildShopFiles()).toEqual(buildShopFiles())
    expect(mulberry32(SEED)()).toBe(mulberry32(SEED)())
  })

  it('writes the four files the import reads', () => {
    expect([...files.keys()].sort()).toEqual([
      'discounts.csv',
      'products.csv',
      'stock.csv',
      'stores.csv',
    ])
  })

  it('has 120 stores, all inside Bali’s bounds, WhatsApp in E.164', () => {
    expect(stores.headers).toEqual([...STORE_HEADERS])
    expect(stores.rows).toHaveLength(120)
    const codes = new Set(stores.rows.map((r) => r[0]!))
    expect(codes.size).toBe(120)
    for (const row of stores.rows) {
      const lat = Number(row[4])
      const lng = Number(row[5])
      expect(lat).toBeGreaterThanOrEqual(LAT_MIN)
      expect(lat).toBeLessThanOrEqual(LAT_MAX)
      expect(lng).toBeGreaterThanOrEqual(LNG_MIN)
      expect(lng).toBeLessThanOrEqual(LNG_MAX)
      expect(row[6]!.startsWith('+62')).toBe(true)
      expect(row[1]!.startsWith('Seed store, ')).toBe(true) // DATA.md §2: mock records say what they are
      expect(row[2]!.startsWith('Mock address (seed)')).toBe(true)
      expect(['yes', 'no']).toContain(row[9])
      expect(['yes', 'no']).toContain(row[10])
    }
    const activeYes = stores.rows.filter((r) => r[9] === 'yes').length
    const publicYes = stores.rows.filter((r) => r[10] === 'yes').length
    expect(activeYes).toBeGreaterThanOrEqual(105) // ≈ 95 % true
    expect(publicYes).toBeGreaterThanOrEqual(85) // ≈ 80 % true
    expect(activeYes).toBeLessThanOrEqual(119)
    expect(publicYes).toBeLessThanOrEqual(119)
  })

  it('prices every product in whole rupiah on the Rp 5.000 grid, within Rp 75.000–4.500.000', () => {
    expect(products.headers).toEqual([...PRODUCT_HEADERS])
    const parentRows = products.rows.filter((r) => r[1] === '')
    expect(parentRows.length).toBeGreaterThanOrEqual(75)
    expect(parentRows.length).toBeLessThanOrEqual(90)
    for (const row of products.rows) {
      const price = Number(row[9])
      expect(Number.isInteger(price)).toBe(true)
      expect(price % 5000).toBe(0)
      expect(price).toBeGreaterThanOrEqual(75000)
      expect(price).toBeLessThanOrEqual(4500000)
      expect(CATEGORIES).toContain(row[6])
      expect(row[10]).toBe('') // related_stock_number left empty in the mock
      expect(row[0]!.startsWith('SEED-')).toBe(true) // DATA.md §2: mock SKUs say what they are
    }
    for (const row of products.rows.filter((r) => r[1] !== '')) {
      expect(skus.has(row[1]!)).toBe(true) // every variant names an existing parent
    }
  })

  it('has every product in stock somewhere, except the ≥ 3 out-of-stock ones', () => {
    expect(stock.headers).toEqual([...STOCK_HEADERS])
    const inStockSomewhere = new Set<string>()
    for (const row of stock.rows) {
      const [store, sku, variantSku, qtyRaw] = [row[0]!, row[1]!, row[2]!, row[3]!]
      expect(parentSkus.has(sku)).toBe(true) // the stock row's sku is the product's
      const qty = Number(qtyRaw)
      expect(Number.isInteger(qty)).toBe(true)
      expect(qty).toBeGreaterThanOrEqual(0)
      expect(qty).toBeLessThanOrEqual(12)
      void store
      if (variantSku !== '') {
        expect(variantToParent.get(variantSku)).toBe(sku) // the variant belongs to the row's product
      } else {
        expect(hasVariants.has(sku)).toBe(false) // a product with variants is stocked per variant
      }
      if (qty > 0) inStockSomewhere.add(sku)
    }
    const outOfStock = [...parentSkus].filter((sku) => !inStockSomewhere.has(sku))
    expect(outOfStock.length).toBeGreaterThanOrEqual(3)
    expect(outOfStock.length).toBeLessThanOrEqual(10)
  })

  it('carries the welcome code WELCOME10 (10 %, once per contact, active)', () => {
    expect(discounts.headers).toEqual([...DISCOUNT_HEADERS])
    expect(discounts.rows).toHaveLength(1)
    expect(discounts.rows[0]).toEqual(['WELCOME10', 'percent', '10', '0', 'yes', '', '', '', 'yes'])
  })
})
