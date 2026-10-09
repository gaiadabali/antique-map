/**
 * The gallery's maker, place and editorial pages (TASKS.md 5.4), on the gallery host, a production
 * build: a seeded maker and a seeded place each list their works, a published page renders, an
 * edited page shows its new words on the next request, a draft page and the shop's page are no
 * address here, and every one of these pages is axe clean at a phone's 390 px and a desktop's
 * 1280 px. The seed is `./pages-seed.ts`'s, against this worktree's own database.
 *
 * One worker runs the file, in order: the seed is idempotent by slug, but two workers seeding at
 * once would race on the same unique slugs (the config is `fullyParallel`).
 */
import { randomBytes } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { republishEdited, seed, type Fixture } from './pages-seed'

test.describe.configure({ mode: 'default' })

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const

async function axeClean(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const found = violations.map(
    ({ id, impact, nodes }) => `${impact ?? 'unknown'} ${id}: ${nodes.map((n) => n.target).join()}`,
  )
  expect(found, label).toEqual([])
}

let fixture: Fixture
test.beforeAll(() => {
  fixture = seed()
})

test.describe('a maker page', () => {
  test('lists its available work before its sold one', async ({ page }) => {
    const response = await page.goto(`/makers/${fixture.makerSlug}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E François Valentijn')
    // A work card is a plain `<a>` (`browse/work-card.tsx`), never a heading — a CSS module class
    // is no selector either, hashed on a production build. Link text in document order instead.
    const links = await page.getByRole('link').allTextContents()
    const available = links.findIndex((text) => text.includes('E2E chart of Java'))
    const sold = links.findIndex((text) => text.includes('E2E sold chart'))
    expect(available, 'available work found').toBeGreaterThanOrEqual(0)
    expect(sold, 'sold work found').toBeGreaterThanOrEqual(0)
    expect(available).toBeLessThan(sold)
  })

  test('is listed on the makers index, linked to its page', async ({ page }) => {
    // The index is cached under the gallery's catalogue tag, which expires stale-while-revalidate
    // (`@engine/cache` EDITORIAL_EXPIRY): the first request after the seed's write can still be
    // served the copy without the new maker, and the next one is fresh. So: look, reload, look.
    const link = page.getByRole('link', { name: /E2E François Valentijn/ })
    await expect(async () => {
      const response = await page.goto('/makers')
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Makers')
      await expect(link).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 30_000 })
    await expect(link).toHaveAttribute('href', `/makers/${fixture.makerSlug}`)
  })
})

test.describe('a place page', () => {
  test('lists its available work under its historical name', async ({ page }) => {
    const response = await page.goto(`/places/${fixture.placePath.join('/')}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E Jakarta')
    await expect(page.getByText('E2E Batavia')).toBeVisible()
    await expect(page.getByRole('link', { name: /E2E chart of Java/ })).toBeVisible()
  })

  test('is reached from its parent on the places index', async ({ page }) => {
    const response = await page.goto('/places')
    expect(response?.status()).toBe(200)
    const parent = page.getByRole('link', { name: /E2E Java/ })
    await expect(parent).toHaveAttribute('href', `/places/${fixture.placePath[0]}`)
    await parent.click()
    const child = page.getByRole('link', { name: 'E2E Jakarta' })
    await expect(child).toHaveAttribute('href', `/places/${fixture.placePath.join('/')}`)
  })
})

test.describe('a published page', () => {
  test('renders its title and body', async ({ page }) => {
    const response = await page.goto(`/${fixture.pageSlug}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E fixture page')
    await expect(page.getByText('First paragraph.')).toBeVisible()
  })

  test('shows its edited words on the next request after a republish', async ({ page }) => {
    const words = `Edited ${randomBytes(4).toString('hex')}.`
    await page.goto(`/${fixture.editedSlug}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E edited page')
    await expect(page.getByText(words)).toHaveCount(0)
    republishEdited(words)
    const response = await page.goto(`/${fixture.editedSlug}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText(words)).toBeVisible()
  })

  test("a draft page and the shop's page are not found here", async ({ page }) => {
    for (const slug of [fixture.draftSlug, fixture.shopSlug]) {
      const response = await page.goto(`/${slug}`)
      expect(response?.status(), slug).toBe(404)
      await expect(page.getByText('E2E draft page')).toHaveCount(0)
      await expect(page.getByText('E2E shop-only page')).toHaveCount(0)
    }
  })
})

test.describe('axe', () => {
  const paths = (f: Fixture) => [
    ['makers index', '/makers'],
    ['maker page', `/makers/${f.makerSlug}`],
    ['places index', '/places'],
    ['place page', `/places/${f.placePath.join('/')}`],
    ['cms page', `/${f.pageSlug}`],
  ]
  for (const viewport of WIDTHS) {
    test(`every page is clean at ${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      for (const [label, path] of paths(fixture)) {
        const response = await page.goto(path!)
        expect(response?.status(), path).toBe(200)
        await axeClean(page, `${label} at ${viewport.width} px`)
      }
    })
  }
})
