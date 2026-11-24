/**
 * Fixtures for the pricing tests: a small catalogue with every line shape (a plain product, variants
 * with and without their own price, an inactive variant, out-of-stock items) and the owner's delivery
 * table as COMMERCE.md §5 describes it (free over Rp 500.000).
 */
import type { DiscountRecord, EligibleDiscount } from './discount'
import type { Catalogue, CatalogueProduct, PricingSettings } from './quote'

export const PLAIN = 1 // Rp 95.000, no variants, in stock
export const PRINT = 2 // Rp 150.000, variants
export const SOLD_OUT = 3 // Rp 42.500, no variants, no store holds one
export const ODD = 4 // Rp 12.345, for rounding
export const HUNDRED = 5 // Rp 100.000, for the threshold

const products: CatalogueProduct[] = [
  { productId: PLAIN, priceIdr: 95_000, inStock: true, variants: [] },
  {
    productId: PRINT,
    priceIdr: 150_000,
    inStock: false, // ignored: the product has variants
    variants: [
      { sku: 'PRINT-A3', priceIdr: null, active: true, inStock: true },
      { sku: 'PRINT-A2', priceIdr: 185_000, active: true, inStock: true },
      { sku: 'PRINT-OLD', priceIdr: 99_000, active: false, inStock: true },
      { sku: 'PRINT-A1', priceIdr: 240_000, active: true, inStock: false },
    ],
  },
  { productId: SOLD_OUT, priceIdr: 42_500, inStock: false, variants: [] },
  { productId: ODD, priceIdr: 12_345, inStock: true, variants: [] },
  { productId: HUNDRED, priceIdr: 100_000, inStock: true, variants: [] },
]

export const CATALOGUE: Catalogue = new Map(products.map((product) => [product.productId, product]))

export const SETTINGS: PricingSettings = {
  delivery: {
    bands: [
      { upToKm: 5, feeIdr: 15_000 },
      { upToKm: 10, feeIdr: 25_000 },
      { upToKm: 20, feeIdr: 40_000 },
    ],
    freeOverIdr: 500_000,
  },
}

export const line = (productId: number, qty: number, variantSku: string | null = null) => ({
  productId,
  variantSku,
  qty,
})

export const percent = (value: number, minSpendIdr: number | null = null): EligibleDiscount => ({
  code: 'WELCOME',
  kind: 'percent',
  value,
  minSpendIdr,
  isBuyerChecked: true,
})

export const fixed = (value: number, minSpendIdr: number | null = null): EligibleDiscount => ({
  code: 'WELCOME',
  kind: 'fixed',
  value,
  minSpendIdr,
  isBuyerChecked: true,
})

export const NOW = new Date('2026-11-01T03:00:00.000Z')

export const welcomeRecord = (overrides: Partial<DiscountRecord> = {}): DiscountRecord => ({
  code: 'WELCOME10',
  kind: 'percent',
  value: 10,
  minSpendIdr: null,
  oncePerBuyer: true,
  startsAt: '2026-10-01T00:00:00.000Z',
  endsAt: '2027-01-01T00:00:00.000Z',
  usageLimit: null,
  usedCount: 0,
  active: true,
  ...overrides,
})

/** A test key: the real one comes from `BAG_COOKIE_KEY`. */
export const TEST_KEY_SECRET = 'test-only-bag-cookie-key-0123456789abcdef'
