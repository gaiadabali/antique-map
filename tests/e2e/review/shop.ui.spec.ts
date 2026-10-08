/**
 * 10.6.f clause 5 (browser half), at 390 and 1280 px: the shop listing (page 1 and 2) shows 24 real design
 * cards each, every card image carries a srcset, loads (naturalWidth > 0) and its derivative answers 200
 * image/webp; 3 catalogue products and 2 Instagram products open with their pictures loaded, the variants
 * Mounted print Rp 450.000 and Framed print Rp 950.000, and the "Digital mockup" label on exactly the Instagram ones.
 */
import { expect, test, type Page } from '@playwright/test'

import { SHOP } from './support'

const MOCK = /SEED-SHOP-|Mock seed|Produk seed/
const INSTAGRAM = ['exotic-bali-1930s', 'balinese-legong-dancer-1925']
/** The other two Instagram designs: Knott's dancer (label on its lead) and the Lombok turtle (its lead is the plain artwork; its mock-up pictures carry the label on the product page). */
const INSTAGRAM_OTHER = ['balinese-dancer-photograph-c-1927', 'lombok-turtle-snorkelling']
const CATALOGUE = ['bali-island-road-map-1937']
const norm = (s: string) => s.replace(/ /g, ' ')

for (const pageNo of [1, 2]) {
  test(`/shop page ${pageNo}: 24 real designs, images with srcset load as webp`, async ({ page }, testInfo) => {
    const res = await page.goto(`${SHOP}/shop${pageNo === 1 ? '' : `?page=${pageNo}`}`, {
      waitUntil: 'load',
    })
    expect(res?.status()).toBe(200)
    const cards = page.locator('a[href^="/product/"][class*="card"]')
    await expect(cards).toHaveCount(24)
    expect(await page.content(), 'no mock marker').not.toMatch(MOCK)
    await expect(page.getByText('156 products').first()).toBeVisible()

    const images = cards.locator('img')
    expect(await images.count()).toBe(24)
    const info = await images.evaluateAll((els) =>
      els.map((e) => ({ src: (e as HTMLImageElement).src, srcset: (e as HTMLImageElement).srcset })),
    )
    expect(info.filter((i) => !i.srcset.includes(' 320w')), 'every card has a srcset').toEqual([])
    // Each lazy image, scrolled into view, decodes.
    for (let i = 0; i < 24; i++) {
      const img = images.nth(i)
      await img.scrollIntoViewIfNeeded()
      await expect
        .poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth), {
          message: `card ${i} image decodes`,
          timeout: 20_000,
        })
        .toBeGreaterThan(0)
    }
    const statuses: string[] = []
    for (const { src } of info) {
      const r = await page.request.get(src)
      const type = r.headers()['content-type'] ?? ''
      if (r.status() !== 200 || !type.startsWith('image/webp')) statuses.push(`${src} ${r.status()} ${type}`)
    }
    expect(statuses, 'derivatives 200 image/webp').toEqual([])
    console.log(`[${testInfo.project.name}] /shop page ${pageNo}: 24 cards, 24 images decoded, 24 derivatives 200 image/webp, all with srcset`)
  })
}

async function openProduct(page: Page, slug: string) {
  const imgs: { url: string; status: number; type: string }[] = []
  page.on('response', (r) => {
    if (r.url().includes('/_media/derivatives/'))
      imgs.push({ url: r.url(), status: r.status(), type: r.headers()['content-type'] ?? '' })
  })
  const res = await page.goto(`${SHOP}/product/${slug}`, { waitUntil: 'load' })
  expect(res?.status(), slug).toBe(200)
  const main = page.locator('main')
  await expect(main.locator('h1')).toBeVisible()
  const first = main.locator('img[srcset]').first()
  await first.scrollIntoViewIfNeeded()
  await expect
    .poll(() => first.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth), { timeout: 20_000 })
    .toBeGreaterThan(0)
  await page.waitForLoadState('networkidle')
  expect(imgs.length, 'derivative requests').toBeGreaterThan(0)
  expect(imgs.filter((i) => i.status !== 200 || !i.type.startsWith('image/webp')), 'derivatives 200 webp').toEqual([])
  return main
}

async function expectVariants(page: Page, main: ReturnType<Page['locator']>) {
  await expect(main.getByText('Mounted print').first()).toBeVisible()
  await expect(main.getByText('Framed print').first()).toBeVisible()
  expect(norm(await main.innerText())).toContain('Rp 450.000')
  await main.getByText('Framed print').first().click()
  await expect.poll(async () => norm(await main.innerText())).toContain('Rp 950.000')
  void page
}

for (const slug of CATALOGUE) {
  test(`catalogue design ${slug}: pictures load, variants and prices, no mock-up label`, async ({ page }) => {
    const main = await openProduct(page, slug)
    await expectVariants(page, main)
    expect(await page.content(), 'no mock-up label').not.toContain('Digital mockup')
    expect(await page.content()).not.toMatch(MOCK)
  })
}

test('two more catalogue designs from /shop page 2: pictures, variants, no mock-up label', async ({ page }) => {
  await page.goto(`${SHOP}/shop?page=2`, { waitUntil: 'load' })
  const hrefs = await page.locator('a[href^="/product/"][class*="card"]').evaluateAll((els) =>
    els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!),
  )
  const slugs = hrefs.map((h) => h.replace('/product/', '')).filter((s) => ![...INSTAGRAM, ...INSTAGRAM_OTHER].includes(s)).slice(0, 2)
  console.log(`catalogue designs opened from /shop page 2: ${slugs.join(', ')}`)
  expect(slugs).toHaveLength(2)
  for (const slug of slugs) {
    const main = await openProduct(page, slug)
    await expectVariants(page, main)
    expect(await page.content(), `${slug}: no mock-up label`).not.toContain('Digital mockup')
  }
})

for (const slug of [...INSTAGRAM, ...INSTAGRAM_OTHER]) {
  test(`Instagram product ${slug}: pictures load, variants and prices, "Digital mockup" label`, async ({ page }) => {
    const main = await openProduct(page, slug)
    await expectVariants(page, main)
    await expect(main.getByText('Digital mockup').first()).toBeVisible()
    expect(await page.content()).not.toMatch(MOCK)
  })
}

test('Instagram product in Indonesian says "Mockup digital"', async ({ page }) => {
  // The id product route is found from the en page's language link.
  await page.goto(`${SHOP}/product/${INSTAGRAM[0]}`, { waitUntil: 'load' })
  const href = await page.locator('nav[aria-label="Language"] a[lang="id"]').getAttribute('href')
  expect(href).toMatch(/^\/id\//)
  const res = await page.goto(`${SHOP}${href}`, { waitUntil: 'load' })
  expect(res?.status()).toBe(200)
  await expect(page.locator('main').getByText('Mockup digital').first()).toBeVisible()
})
