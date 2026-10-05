/**
 * The shop product page (6.1.c; ticket 6qa-r1 point 1): at 390 px a seeded product with variants
 * loads, the variant picker changes the variant and its price, and axe is clean at 390 and 1280 px
 * on both a variant product and the zero-stock product. No `data-testid` is added to product code
 * — every locator is a real role or the lexicon's own text (the same strings
 * `engine/apps/web/src/sites/shop/product/copy.ts` renders).
 *
 * Products are never hard-coded: `findCandidates` reads the live `/api/products` list (published
 * only, the same access rule a visitor's browser gets) and loads each product page to find, from
 * the real rendered markup, one with a working (non-disabled) variant picker whose variants carry
 * different prices, and one whose add button is disabled (out of stock everywhere). A worktree
 * without either is a setup gap (`docs/gates/phase-6-checks.md` §6.1.c, ticket 6qa.md step 1), and
 * the suite fails loudly rather than skipping (rule 6: "a missing product is a failure").
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const PORT = process.env.E2E_PORT ?? '4282'
// The `request` fixture uses Node's resolver, which may not know `*.localhost` (playwright.config.ts's
// own note); a plain IP plus a Host header reaches the same vhost Chromium resolves by name.
const BASE_URL = `http://127.0.0.1:${PORT}`
const HOST_HEADER = { Host: `shop.localhost:${PORT}` }
const SHOTS = process.env.PHASE6_SHOTS

type ProductSummary = { readonly slug: string }

type Candidates = {
  /** A published product with >=2 variants whose prices differ, and stock to add. */
  readonly withVariants: { slug: string; variantLabels: string[] }
  /** A published product whose add button is disabled everywhere (zero stock). */
  readonly outOfStock: { slug: string }
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
  slug: string,
): Promise<{
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
  // Only the chosen variant's price renders into a `__price` span; every variant's own
  // `priceText` (`variant-picker.tsx`'s `PickerVariant`) is still in the RSC payload for
  // hydration, escaped as `\"Rp …\"`, so that is what tells the variants' prices apart.
  const variantPrices = [...html.matchAll(/priceText\\":\\"(Rp[^"\\]+)\\"/g)].map((m) => m[1] ?? '')
  const addDisabled = /__addButton"\s+disabled/.test(html)
  return { slug, variantValues, variantLabels, variantPrices, addDisabled, status: res.status() }
}

/** Finds the two products the suite needs by reading real product pages — never a guess. */
async function findCandidates(request: APIRequestContext): Promise<Candidates> {
  const products = await listProducts(request)
  expect(products.length, 'seeded, published products').toBeGreaterThan(0)

  let withVariants: Candidates['withVariants'] | null = null
  let outOfStock: Candidates['outOfStock'] | null = null

  for (const { slug } of products) {
    if (withVariants !== null && outOfStock !== null) break
    const found = await inspect(request, slug)
    if (found.status !== 200) continue

    if (
      withVariants === null &&
      found.variantValues.length >= 2 &&
      !found.addDisabled &&
      new Set(found.variantPrices).size >= 2
    ) {
      withVariants = { slug: found.slug, variantLabels: found.variantLabels }
    }
    if (outOfStock === null && found.addDisabled) {
      outOfStock = { slug: found.slug }
    }
  }

  expect(withVariants, 'a published product with >=2 differently priced variants, in stock').not
    .toBeNull()
  expect(outOfStock, 'a published product with its add button disabled (zero stock)').not
    .toBeNull()
  return { withVariants: withVariants!, outOfStock: outOfStock! }
}

async function shoot(page: Page, name: string) {
  if (!SHOTS) return
  const { mkdirSync } = await import('node:fs')
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, animations: 'disabled' })
}

async function axeClean(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const found = violations.map(
    ({ id, impact, nodes }) => `${impact ?? 'unknown'} ${id}: ${nodes.map((n) => n.target).join()}`,
  )
  expect(found, label).toEqual([])
}

test.describe('Shop product page (6.1.c)', () => {
  let candidates: Candidates

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    candidates = await findCandidates(request)
    await request.dispose()
  })

  test('a seeded product with variants loads at 390 px; the picker changes variant and price', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const response = await page.goto(`/product/${candidates.withVariants.slug}`)
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const radios = page.getByRole('radio')
    await expect(radios).toHaveCount(candidates.withVariants.variantLabels.length)

    const first = page.getByRole('radio', { name: candidates.withVariants.variantLabels[0] })
    const second = page.getByRole('radio', { name: candidates.withVariants.variantLabels[1] })
    await expect(first).toBeChecked()
    await expect(second).not.toBeChecked()

    const priceBefore = await page.locator('[class*="__price"]').textContent()
    await second.check()
    await expect(second).toBeChecked()
    await expect(first).not.toBeChecked()
    const priceAfter = await page.locator('[class*="__price"]').textContent()
    expect(priceAfter, 'the price text changes with the chosen variant').not.toBe(priceBefore)

    await shoot(page, 'product-variants-390')
    await axeClean(page, 'product with variants, 390px')
  })

  test('axe is clean on the variant product at 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const response = await page.goto(`/product/${candidates.withVariants.slug}`)
    expect(response?.status()).toBe(200)
    await shoot(page, 'product-variants-1280')
    await axeClean(page, 'product with variants, 1280px')
  })

  test('clicking Add to bag on the real path fails: the product page is still wired to the 6.1.b placeholder, not 6.2’s bag (finding, not fixed here)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/product/${candidates.withVariants.slug}`)
    const addButton = page.getByRole('button', { name: 'Add to bag' })
    await expect(addButton).toBeEnabled()
    await addButton.click()
    await expect(page.getByRole('status').filter({ hasText: 'We could not add it' })).toBeVisible()

    await page.goto('/bag')
    await expect(page.getByText('Your bag is empty')).toBeVisible()
  })

  test('the zero-stock product shows "Out of stock" at 390 px, its add button is disabled, and the real placeholder action it posts to never adds a line', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const response = await page.goto(`/product/${candidates.outOfStock.slug}`)
    expect(response?.status()).toBe(200)

    const addButton = page.getByRole('button', { name: 'Out of stock' })
    await expect(addButton).toBeVisible()
    await expect(addButton).toBeDisabled()
    await expect(page.getByText('Out of stock').first()).toBeVisible()

    await shoot(page, 'product-out-of-stock-390')
    await axeClean(page, 'out-of-stock product, 390px')

    // The real add path (actions.ts' own export, called the way the module exposes it — no
    // invented route): proves the placeholder never adds a line, disabled button or not.
    const actions = (await import(
      '../../../engine/apps/web/src/sites/shop/product/actions'
    )) as typeof import('../../../engine/apps/web/src/sites/shop/product/actions')
    const result = await actions.addToBagPlaceholder({
      sku: 'whatever-sku',
      variantSku: null,
      qty: 1,
    })
    expect(result).toEqual({ ok: false, reason: 'not-built-yet' })

    await page.goto('/bag')
    await expect(page.getByText('Your bag is empty')).toBeVisible()
  })

  test('axe is clean on the out-of-stock product at 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const response = await page.goto(`/product/${candidates.outOfStock.slug}`)
    expect(response?.status()).toBe(200)
    await shoot(page, 'product-out-of-stock-1280')
    await axeClean(page, 'out-of-stock product, 1280px')
  })
})
