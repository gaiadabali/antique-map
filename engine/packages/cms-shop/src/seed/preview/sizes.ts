/**
 * The client preview's sizes step (`./index`): the Map of Bali Island 1724 sold in four sizes —
 * mounted and framed, A3 and A2 — in whole rupiah, with the A3 rows keeping their SKUs (`-M`,
 * `-F`) and the A2 rows new (`-M-A2`, `-F-A2`). The new SKUs get 3 in stock in up to ten stores
 * that hold the mounted print. Only the product's variants are set; pricing stays the checkout's.
 * A second run finds everything in place and writes nothing.
 */
import { allOf, idOf, writeOf, type Doc, type Step } from './shared'

export const SIZED_PRODUCT = 'map-of-bali-island-1724'
const NEW_STOCK = 3
const STOCK_STORES = 10

type Size = { suffix: string; en: string; id: string; price: number }

/** In the order the product page lists them. Prices in whole rupiah. */
export const SIZES: readonly Size[] = [
  {
    suffix: '-M',
    en: 'Mounted print · A3 (30 × 42 cm)',
    id: 'Cetakan mounted · A3 (30 × 42 cm)',
    price: 450_000,
  },
  {
    suffix: '-M-A2',
    en: 'Mounted print · A2 (42 × 59 cm)',
    id: 'Cetakan mounted · A2 (42 × 59 cm)',
    price: 650_000,
  },
  {
    suffix: '-F',
    en: 'Framed print · A3 (30 × 42 cm)',
    id: 'Cetakan berbingkai · A3 (30 × 42 cm)',
    price: 950_000,
  },
  {
    suffix: '-F-A2',
    en: 'Framed print · A2 (42 × 59 cm)',
    id: 'Cetakan berbingkai · A2 (42 × 59 cm)',
    price: 1_350_000,
  },
]

type Variant = { id?: string; sku?: string; label?: string | null; price?: number | null }

export type SizesReport = { product: boolean; variantsWritten: boolean; stockAdded: number }

async function variantsIn(step: Step, id: number, locale: 'en' | 'id'): Promise<Variant[]> {
  const doc = (await step.payload.findByID({
    collection: 'products',
    id,
    ...writeOf(step, locale),
    fallbackLocale: false as never,
    depth: 0,
  })) as unknown as Doc
  return (doc.variants ?? []) as Variant[]
}

const matches = (variants: Variant[], base: string, locale: 'en' | 'id'): boolean =>
  variants.length === SIZES.length &&
  SIZES.every((size, at) => {
    const variant = variants[at]
    return (
      variant?.sku === `${base}${size.suffix}` &&
      variant.label === size[locale] &&
      variant.price === size.price
    )
  })

async function writeVariants(step: Step, product: Doc, base: string): Promise<boolean> {
  const en = await variantsIn(step, product.id, 'en')
  const id = await variantsIn(step, product.id, 'id')
  if (matches(en, base, 'en') && matches(id, base, 'id')) return false
  const rows = SIZES.map((size) => {
    const sku = `${base}${size.suffix}`
    const kept = en.find((each) => each.sku === sku)
    return { ...(kept?.id ? { id: kept.id } : {}), sku, label: size.en, price: size.price }
  })
  await step.payload.update({
    collection: 'products',
    id: product.id,
    ...writeOf(step, 'en'),
    data: { variants: rows.map((row) => ({ ...row, active: true })) } as never,
  })
  const after = await variantsIn(step, product.id, 'id')
  await step.payload.update({
    collection: 'products',
    id: product.id,
    ...writeOf(step, 'id'),
    data: {
      variants: after.map((variant) => ({
        ...variant,
        label: SIZES.find((size) => `${base}${size.suffix}` === variant.sku)?.id ?? variant.label,
      })),
    } as never,
  })
  return true
}

async function addStock(step: Step, product: Doc, base: string): Promise<number> {
  const holders = (
    await allOf(step, 'stock-levels', {
      and: [{ product: { equals: product.id } }, { variantSku: { equals: `${base}-M` } }],
    })
  ).slice(0, STOCK_STORES)
  let added = 0
  for (const holder of holders) {
    const store = idOf(holder.store)
    if (store === null) continue
    for (const sku of [`${base}-M-A2`, `${base}-F-A2`]) {
      const present = await allOf(step, 'stock-levels', {
        and: [
          { product: { equals: product.id } },
          { variantSku: { equals: sku } },
          { store: { equals: store } },
        ],
      })
      if (present.length > 0) continue
      await step.payload.create({
        collection: 'stock-levels',
        ...writeOf(step),
        data: { product: product.id, variantSku: sku, store, quantity: NEW_STOCK } as never,
      })
      added += 1
    }
  }
  return added
}

export async function seedSizes(step: Step): Promise<SizesReport> {
  const [product] = await allOf(step, 'products', { slug: { equals: SIZED_PRODUCT } })
  if (!product) return { product: false, variantsWritten: false, stockAdded: 0 }
  const base = String(product.sku)
  const variantsWritten = await writeVariants(step, product, base)
  return { product: true, variantsWritten, stockAdded: await addStock(step, product, base) }
}
