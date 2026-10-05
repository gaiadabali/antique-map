/**
 * The shop product page (6.1.c; ticket 6qa-r3 point 2): at 390 px a seeded product with variants
 * loads, the variant picker changes the variant and its price, Add to bag works against the real
 * bag (`addToBagAction`), and the zero-stock product's add button is disabled and a forced post of
 * the same action is refused. Axe is clean at 390 and 1280 px on both a variant product and the
 * zero-stock product. No `data-testid` is added to product code — every locator is a real role or
 * the lexicon's own text (the same strings `engine/apps/web/src/sites/shop/product/copy.ts` and
 * `engine/apps/web/src/sites/shop/bag/copy.ts` render).
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
// The real host, for page navigation (Chromium resolves `*.localhost` by itself) and for a
// forced server-action replay, which must hit the exact origin Next's own CSRF check expects.
const SHOP_ORIGIN = `http://shop.localhost:${PORT}`
const SHOTS = process.env.PHASE6_SHOTS

type ProductSummary = { readonly id: number; readonly slug: string }

type Candidates = {
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
  // Only the chosen variant's price renders into a `__price` span; every variant's own
  // `priceText` (`variant-picker.tsx`'s `PickerVariant`) is still in the RSC payload for
  // hydration, escaped as `\"Rp …\"`, so that is what tells the variants' prices apart.
  const variantPrices = [...html.matchAll(/priceText\\":\\"(Rp[^"\\]+)\\"/g)].map((m) => m[1] ?? '')
  const addDisabled = /__addButton"\s+disabled/.test(html)
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
async function findCandidates(request: APIRequestContext): Promise<Candidates> {
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

async function shoot(page: Page, name: string) {
  if (!SHOTS) return
  const { mkdirSync } = await import('node:fs')
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, animations: 'disabled' })
}

/**
 * Clicks the real "Add to bag" button on `slug`'s own page, in a throwaway browser context the
 * test closes right after — so the click's real, successful add never touches the calling test's
 * own bag — and returns the exact POST it sent: the request Next's client runtime makes for a
 * `useActionState` form action (a `Next-Action` header naming the function, a multipart body of
 * the form's own named fields). Replaying it with a field swapped is the only way to force the
 * action without inventing a route.
 */
async function captureAddToBagRequest(
  page: Page,
  slug: string,
): Promise<{ url: string; headers: Record<string, string>; body: string }> {
  const browser = page.context().browser()
  if (browser === null) throw new Error('capturing the add-to-bag request needs a real browser')
  const captureContext = await browser.newContext()
  const capturePage = await captureContext.newPage()
  await capturePage.goto(`${SHOP_ORIGIN}/product/${slug}`)
  const [addRequest] = await Promise.all([
    capturePage.waitForRequest(
      (req) => req.method() === 'POST' && req.headers()['next-action'] !== undefined,
    ),
    capturePage.getByRole('button', { name: 'Add to bag' }).click(),
  ])
  const url = addRequest.url()
  const headers = addRequest.headers()
  const body = (addRequest.postDataBuffer() ?? Buffer.from('')).toString('utf8')
  await captureContext.close()
  return { url, headers, body }
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

  test('Add to bag works: choosing a variant and pressing Add to bag adds it, and pressing again raises its quantity to 2', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/product/${candidates.withVariants.slug}`)

    const variantLabel = candidates.withVariants.variantLabels[1]!
    const variant = page.getByRole('radio', { name: variantLabel })
    await variant.check()
    await expect(variant).toBeChecked()

    const addButton = page.getByRole('button', { name: 'Add to bag' })
    const addedStatus = page.getByRole('status').filter({ hasText: 'Added to your bag.' })

    await expect(addButton).toBeEnabled()
    await addButton.click()
    await expect(addedStatus).toBeVisible()

    await shoot(page, 'product-added-bag-390')

    await page.goto('/bag')
    const line = page.getByRole('listitem').filter({ hasText: variantLabel })
    await expect(line).toBeVisible()
    await expect(line.getByRole('spinbutton')).toHaveValue('1')

    // Pressing again, same product and variant, merges into the same line (`addToBag`'s
    // `updated` outcome) rather than adding a second one.
    await page.goto(`/product/${candidates.withVariants.slug}`)
    await variant.check()
    await expect(variant).toBeChecked()
    await addButton.click()
    await expect(addedStatus).toBeVisible()

    await page.goto('/bag')
    await expect(page.getByRole('listitem').filter({ hasText: variantLabel })).toHaveCount(1)
    await expect(line.getByRole('spinbutton')).toHaveValue('2')
  })

  test('the zero-stock product shows "Out of stock" at 390 px, has no working add button, and a forced post of the real add action is refused', async ({
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

    // The real add-to-bag server action (`addToBagAction`), forced: captured from the enabled
    // variant product's own request in a throwaway browser context (so this test's own, still
    // empty, bag cookie is never touched by that real click), then replayed on this page's
    // session with the zero-stock product's id swapped in for the captured one and no variant —
    // no invented route, the exact POST the enabled page's button sends.
    const captured = await captureAddToBagRequest(page, candidates.withVariants.slug)
    const forcedBody = captured.body
      .replace(/(name="productId"\r\n\r\n)\d+/, `$1${candidates.outOfStock.id}`)
      .replace(/(name="variantSku"\r\n\r\n)[^\r\n]*/, '$1')
    const headers = { ...captured.headers, host: `shop.localhost:${PORT}` }
    delete headers['content-length']
    delete headers['cookie']
    // `page.request` uses Node's resolver, which may not know `*.localhost` (this file's own
    // note on `BASE_URL`); the captured URL's path, posted at the plain IP with the real `Host`
    // header above, reaches the same vhost the browser posted to.
    const forcedUrl = captured.url.replace(/^https?:\/\/[^/]+/, BASE_URL)

    const forced = await page.request.post(forcedUrl, {
      headers,
      data: Buffer.from(forcedBody, 'utf8'),
    })
    expect(
      forced.ok(),
      'the forced post reaches the action (refused by outcome, not a transport error)',
    ).toBeTruthy()

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
