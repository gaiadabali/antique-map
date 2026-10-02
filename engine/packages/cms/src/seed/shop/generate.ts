/**
 * TASKS.md 3.7.c: the shop's mock seed as import files (docs/DATA.md §1–§3, docs/CONTENT-MODEL.md §9).
 * Deterministic: one inline seeded PRNG (mulberry32, SEED 20261003), no clock, no dependency — the same
 * command twice writes identical bytes. The owner's real sheets replace these files through the 3.7.a
 * import with no code change (requirement 10.3). Mock records say what they are (DATA.md §2): names
 * start "Seed store", addresses are plainly mock; SKUs start SEED-. One file on purpose: the repo's
 * Bundler-style TS resolution does not mix with plain Node's ESM loader, and the generator must run
 * without tsx (not a dependency here).
 *
 * Run with plain Node (≥ 22.13 native type stripping):
 *   node engine/packages/cms/src/seed/shop/generate.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const SEED = 20261003

/** mulberry32 — small, fast, deterministic; written inline so no new dependency. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** ~15 real Bali town centres; pins jitter ≤ 0.03° around them, inside lat −8.85…−8.05, lng 114.43…115.71. */
const TOWNS = [
  { code: 'DPS', en: 'Denpasar', lat: -8.6705, lng: 115.2126 },
  { code: 'UBD', en: 'Ubud', lat: -8.5069, lng: 115.2625 },
  { code: 'CGU', en: 'Canggu', lat: -8.6478, lng: 115.1385 },
  { code: 'SMY', en: 'Seminyak', lat: -8.6913, lng: 115.1578 },
  { code: 'SNR', en: 'Sanur', lat: -8.6884, lng: 115.2631 },
  { code: 'ULW', en: 'Uluwatu', lat: -8.8153, lng: 115.0888 },
  { code: 'AMD', en: 'Amed', lat: -8.3404, lng: 115.6746 },
  { code: 'LVN', en: 'Lovina', lat: -8.1662, lng: 115.0327 },
  { code: 'SGR', en: 'Singaraja', lat: -8.1141, lng: 115.0889 },
  { code: 'TBN', en: 'Tabanan', lat: -8.5414, lng: 115.1219 },
  { code: 'KTA', en: 'Kuta', lat: -8.7184, lng: 115.1686 },
  { code: 'NSD', en: 'Nusa Dua', lat: -8.7997, lng: 115.2355 },
  { code: 'GNY', en: 'Gianyar', lat: -8.5414, lng: 115.3269 },
  { code: 'KKG', en: 'Karangasem', lat: -8.4377, lng: 115.6109 },
  { code: 'NGR', en: 'Negara', lat: -8.3585, lng: 114.6169 },
]

/** The shop's categories (DATA.md §1) — matched by label at import, never created by guess. */
const CATEGORIES = 'Prints;Map reproductions;Textiles;Homeware;Stationery;Gifts'.split(';')
const MATERIALS = ['teak', 'rattan', 'cotton', 'mulberry paper', 'stoneware']
const MOTIFS = ['parang', 'kawung', 'frangipani', 'rice terrace', 'coral', 'wayang']
/** Product kinds per category; `v` is the variant labels, `;`-separated. */
const KINDS: Record<string, { en: string; id: string; v?: string }[]> = {
  Prints: [
    { en: 'Botanical print', id: 'Cetakan botani', v: 'A3;A2' },
    { en: 'Bird print', id: 'Cetakan burung' },
    { en: 'Orchid print', id: 'Cetakan anggrek', v: 'A3;A2' },
  ],
  'Map reproductions': [
    { en: 'Map reproduction', id: 'Reproduksi peta', v: '50 × 70 cm;70 × 100 cm' },
    { en: 'Island chart reproduction', id: 'Reproduksi peta laut', v: '50 × 70 cm' },
    { en: 'City plan reproduction', id: 'Reproduksi denah kota' },
  ],
  Textiles: [
    { en: 'Batik sarong', id: 'Sarung batik', v: 'Indigo;Sogan' },
    { en: 'Ikat throw', id: 'Selimut ikat' },
    { en: 'Table runner', id: 'Pelapis meja', v: 'Natural;Indigo' },
  ],
  Homeware: [
    { en: 'Ceramic bowl', id: 'Mangkuk keramik' },
    { en: 'Coconut bowl set', id: 'Set mangkuk kelapa', v: 'Set of 2;Set of 4' },
    { en: 'Rattan basket', id: 'Keranjang rotan' },
    { en: 'Wooden serving board', id: 'Papan saji kayu' },
  ],
  Stationery: [
    { en: 'Notebook', id: 'Buku catatan', v: 'Plain;Dotted' },
    { en: 'Greeting card set', id: 'Set kartu ucapan' },
    { en: 'Wrapping paper sheet', id: 'Lembar kertas kado' },
  ],
  Gifts: [
    { en: 'Candle in ceramic cup', id: 'Lilin dalam cangkir keramik' },
    { en: 'Soap bar gift box', id: 'Kotak sabun hadiah' },
    { en: 'Postcard box', id: 'Kotak kartu pos' },
  ],
}

/** The exact documented column headers (CONTENT-MODEL.md §9; stock and stores carry the ticket's extra column). */
export const STORE_HEADERS =
  'store_code,name,address,area,lat,lng,whatsapp,hours_en,hours_id,active,public'.split(',')
export const PRODUCT_HEADERS =
  'sku,parent_sku,name_en,name_id,variant_label_en,variant_label_id,category,description_en,description_id,price_idr,related_stock_number,image_files,active'.split(
    ',',
  )
export const STOCK_HEADERS = 'store_code,sku,variant_sku,quantity'.split(',')
export const DISCOUNT_HEADERS =
  'code,kind,value,min_spend,once_per_buyer,starts_at,ends_at,usage_limit,active'.split(',')

const STORES_PER_TOWN = 8
const PRODUCT_COUNT = 80
const OUT_OF_STOCK_COUNT = 4

function csvEscape(value: string | number | null): string {
  const s = value === null ? '' : String(value)
  return /[",;\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}
function toCsv(headers: readonly string[], rows: (string | number | null)[][]): string {
  return [headers.join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n') + '\n'
}

export type Product = {
  sku: string
  nameEn: string
  nameId: string
  category: string
  price: number
  variants: { sku: string; labelEn: string; labelId: string }[]
}

export function buildStores(rng: () => number): string {
  const rows: (string | number | null)[][] = []
  for (const t of TOWNS) {
    for (let i = 1; i <= STORES_PER_TOWN; i++) {
      const lat = +(t.lat + (rng() * 0.06 - 0.03)).toFixed(6)
      const lng = +(t.lng + (rng() * 0.06 - 0.03)).toFixed(6)
      const num = String(i).padStart(3, '0')
      const wa = `+62${810 + Math.floor(rng() * 80)}${String(10000000 + Math.floor(rng() * 89999999)).slice(0, 8)}`
      rows.push([
        `${t.code}-${num}`,
        `Seed store, ${t.en} ${num}`,
        `Mock address (seed) — Jl. Contoh No. ${10 + Math.floor(rng() * 80)}, ${t.en}`,
        t.en,
        lat,
        lng,
        wa,
        'Mon–Sun 09:00–21:00',
        'Sen–Min 09.00–21.00',
        rng() < 0.95 ? 'yes' : 'no',
        rng() < 0.8 ? 'yes' : 'no',
      ])
    }
  }
  return toCsv(STORE_HEADERS, rows)
}

export function buildProducts(rng: () => number): { csv: string; products: Product[] } {
  const rows: (string | number | null)[][] = []
  const products: Product[] = []
  for (let i = 1; i <= PRODUCT_COUNT; i++) {
    const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)]!
    const kind = KINDS[category]![Math.floor(rng() * KINDS[category]!.length)]!
    const motif = MOTIFS[Math.floor(rng() * MOTIFS.length)]!
    const material = MATERIALS[Math.floor(rng() * MATERIALS.length)]!
    const sku = `SEED-SHOP-${String(i).padStart(3, '0')}`
    const nameEn = `${kind.en} — ${motif}`
    const nameId = `${kind.id} — ${motif}`
    const price = (15 + Math.floor(rng() * 885)) * 5000 // Rp 75.000 … Rp 4.500.000, whole rupiah
    const descEn = `Mock seed product. ${kind.en} with a ${motif} motif, made of ${material} by our Bali partners.`
    const descId = `Produk seed tiruan. ${kind.id} dengan motif ${motif}, dibuat dari ${material} oleh mitra kami di Bali.`
    const variants = (kind.v ? kind.v.split(';') : []).map((label, vi) => ({
      sku: `${sku}-${vi + 1}`,
      labelEn: label,
      labelId: label,
    }))
    products.push({ sku, nameEn, nameId, category, price, variants })
    rows.push([
      sku,
      null,
      nameEn,
      nameId,
      null,
      null,
      category,
      descEn,
      descId,
      price,
      null,
      null,
      'yes',
    ])
    for (const v of variants) {
      rows.push([
        v.sku,
        sku,
        nameEn,
        nameId,
        v.labelEn,
        v.labelId,
        category,
        descEn,
        descId,
        price,
        null,
        null,
        'yes',
      ])
    }
  }
  return { csv: toCsv(PRODUCT_HEADERS, rows), products }
}

export function buildStock(rng: () => number, products: Product[]): string {
  const rows: (string | number | null)[][] = []
  const storeCodes = TOWNS.flatMap((t) =>
    Array.from(
      { length: STORES_PER_TOWN },
      (_, i) => `${t.code}-${String(i + 1).padStart(3, '0')}`,
    ),
  )
  // The first OUT_OF_STOCK_COUNT products in PRNG order are out of stock everywhere ("Out of stock" path).
  const outOfStock = new Set<string>()
  while (outOfStock.size < OUT_OF_STOCK_COUNT)
    outOfStock.add(products[Math.floor(rng() * products.length)]!.sku)
  const hasPositive = new Map<string, boolean>()
  for (const p of products) hasPositive.set(p.sku, false)
  for (const store of storeCodes) {
    for (const p of products) {
      if (rng() > 0.55) continue
      const lines = p.variants.length ? p.variants : [{ sku: p.sku, labelEn: '', labelId: '' }]
      for (const line of lines) {
        const isVariant = Boolean(p.variants.length)
        let qty = rng() < 0.3 ? 0 : 1 + Math.floor(rng() * 12)
        if (outOfStock.has(p.sku)) qty = 0
        else if (qty > 0 && !hasPositive.get(p.sku)) hasPositive.set(p.sku, true)
        rows.push([store, isVariant ? p.sku : line.sku, isVariant ? line.sku : null, qty])
      }
    }
  }
  // Every product not in the out-of-stock set must be in stock in at least one store.
  for (const p of products) {
    if (outOfStock.has(p.sku) || hasPositive.get(p.sku)) continue
    const v = p.variants[0]
    rows.push([storeCodes[0]!, p.sku, v ? v.sku : null, 1 + Math.floor(rng() * 5)])
  }
  return toCsv(STOCK_HEADERS, rows)
}

export function buildDiscounts(): string {
  return toCsv(DISCOUNT_HEADERS, [['WELCOME10', 'percent', 10, 0, 'yes', null, null, null, 'yes']])
}

/** All four files, in the import's load order (stores, products, stock, discounts). */
export function buildShopFiles(): { name: string; content: string }[] {
  const rng = mulberry32(SEED)
  const stores = buildStores(rng)
  const { csv: productsCsv, products } = buildProducts(rng)
  const stock = buildStock(rng, products)
  const discounts = buildDiscounts()
  return [
    { name: 'stores.csv', content: stores },
    { name: 'products.csv', content: productsCsv },
    { name: 'stock.csv', content: stock },
    { name: 'discounts.csv', content: discounts },
  ]
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data')
  fs.mkdirSync(dir, { recursive: true })
  const files = buildShopFiles()
  for (const f of files) fs.writeFileSync(path.join(dir, f.name), f.content, 'utf8')
  console.log(`Wrote ${files.length} files to ${dir}`)
}
