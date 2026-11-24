/**
 * The product spec's candidates (`./product.spec.ts`, 6.1.c): the server it reaches and the two
 * products it needs, found by reading real product pages. Split from the spec to keep it under
 * 300 lines.
 */
import { expect, type APIRequestContext } from '@playwright/test'

export const PORT = process.env.E2E_PORT ?? '4282'
// The `request` fixture uses Node's resolver, which may not know `*.localhost` (playwright.config.ts's
// own note); a plain IP plus a Host header reaches the same vhost Chromium resolves by name.
export const BASE_URL = `http://127.0.0.1:${PORT}`
export const HOST_HEADER = { Host: `shop.localhost:${PORT}` }
// The real host, for page navigation (Chromium resolves `*.localhost` by itself) and for a
// forced server-action replay, which must hit the exact origin Next's own CSRF check expects.
export const SHOP_ORIGIN = `http://shop.localhost:${PORT}`
/** The chosen variant's price: the picker's `price` element (CSS Modules' `<hash>_price`). */
export const PRICE = '[class$="_price"], [class*="_price "]'

type ProductSummary = { readonly id: number; readonly slug: string }

export type Candidates = {
  /** A published product with >=2 variants whose prices differ, and stock to add. */
  readonly withVariants: { id: number; slug: string; variantLabels: string[] }
  /** A published product whose add button is disabled everywhere (zero stock). */
  readonly outOfStock: { id: number; slug: string }
}

async function listProducts(request: APIRequestContext): Promise<ProductSummary[]> {
  const res = await request.get(`${BASE_URL}/api/products?limit=200&depth=0`, {
    headers: HOST_HEADER,
  })
  expect(res.ok(), 'GET /api/products').toBeTruthy()
  const body = (await res.json()) as { docs: ProductSummary[] }
  return body.docs
}

/** Reads one product page's real markup for what the suite needs to classify it. */
async function inspect(
  request: APIRequestContext,
  id: number,
  slug: string,
): Promise<{
  id: number
  slug: string
  variantValues: string[]
  variantLabels: string[]
  variantPrices: string[]
  addDisabled: boolean
  status: number
}> {
  const res = await request.get(`${BASE_URL}/product/${slug}`, { headers: HOST_HEADER })
  const html = await res.text()
  const variantValues = [...html.matchAll(/type="radio"[^>]*value="([^"]+)"/g)].map(
    (m) => m[1] ?? '',
  )
  const variantLabels = [...html.matchAll(/optionLabel">([^<]+)</g)].map((m) => m[1] ?? '')
  // Only the chosen variant's price renders into the `price` element (PRICE); every variant's own
  // `priceText` (`variant-picker.tsx`'s `PickerVariant`) is still in the RSC payload for
  // hydration, escaped as `\"Rp …\"`, so that is what tells the variants' prices apart.
  const variantPrices = [...html.matchAll(/priceText\\":\\"(Rp[^"\\]+)\\"/g)].map((m) => m[1] ?? '')
  // The class list ends with `addButton`, CSS Modules' `<hash>_addButton` in today's build (it
  // was `…__addButton`, which the old `__addButton"` pattern alone matched: CI 45349130204).
  const addDisabled = /_addButton"\s+disabled/.test(html)
  return {
    id,
    slug,
    variantValues,
    variantLabels,
    variantPrices,
    addDisabled,
    status: res.status(),
  }
}

/** Finds the two products the suite needs by reading real product pages — never a guess. */
export async function findCandidates(request: APIRequestContext): Promise<Candidates> {
  const products = await listProducts(request)
  expect(products.length, 'seeded, published products').toBeGreaterThan(0)

  let withVariants: Candidates['withVariants'] | null = null
  let outOfStock: Candidates['outOfStock'] | null = null

  for (const { id, slug } of products) {
    if (withVariants !== null && outOfStock !== null) break
    const found = await inspect(request, id, slug)
    if (found.status !== 200) continue

    if (
      withVariants === null &&
      found.variantValues.length >= 2 &&
      !found.addDisabled &&
      new Set(found.variantPrices).size >= 2
    ) {
      withVariants = { id: found.id, slug: found.slug, variantLabels: found.variantLabels }
    }
    if (outOfStock === null && found.addDisabled) {
      outOfStock = { id: found.id, slug: found.slug }
    }
  }

  expect(
    withVariants,
    'a published product with >=2 differently priced variants, in stock',
  ).not.toBeNull()
  expect(outOfStock, 'a published product with its add button disabled (zero stock)').not.toBeNull()
  return { withVariants: withVariants!, outOfStock: outOfStock! }
}
