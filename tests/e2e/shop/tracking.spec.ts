/**
 * The tracking page and "find my order" (TASKS.md 7.3.a, 7.3.c), on the shop host, a production
 * build.
 *
 * What this file proves: a wrong token answers the same 404 a missing one would, `noindex`, and
 * the find-my-order index never reveals whether an order exists, axe clean at both widths. What it
 * cannot prove (reported, not fixed here): the 30-guesses-a-minute throttle is proven at the
 * function level (`engine/apps/web/src/sites/shop/tracking/rate-limit.test.ts`) because a throttled
 * guess answers the very same 404 a wrong token does (`rate-limit.ts`'s own header) — an e2e spec
 * cannot tell the two apart by the response alone; a real tracking page (a timeline, a driver
 * image) needs a real order, which only a full checkout makes — that is phase 7.4's gate, not this
 * file's.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const

async function axeClean(page: import('@playwright/test').Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const found = violations.map(
    ({ id, impact, nodes }) => `${impact ?? 'unknown'} ${id}: ${nodes.map((n) => n.target).join()}`,
  )
  expect(found, label).toEqual([])
}

test.describe('the token page', () => {
  test('a wrong token is a 404', async ({ page }) => {
    const wrong = await page.goto('/track/this-token-does-not-exist-at-all')
    expect(wrong?.status()).toBe(404)
  })

  test('is noindex', async ({ page }) => {
    await page.goto('/track/this-token-does-not-exist-at-all')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })
})

test.describe('find my order', () => {
  for (const viewport of WIDTHS) {
    test(`is axe clean at ${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const response = await page.goto('/track')
      expect(response?.status()).toBe(200)
      await axeClean(page, `/track at ${viewport.width} px`)
    })
  }

  test('never reveals whether an order exists', async ({ page }) => {
    await page.goto('/track')
    await page.getByLabel(/order number/i).fill('999999999')
    await page.getByLabel(/email or whatsapp/i).fill('nobody@example.test')
    await page.getByRole('button', { name: /send me the link/i }).click()
    await expect(page.getByRole('status')).toContainText(/if those details match/i)
  })
})
