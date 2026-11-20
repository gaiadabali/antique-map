/**
 * "See the original" on the shop app (TASKS.md 23.5, 23.6.a; phase 23's **Done when**): a product
 * made from an antique names it and links its page in the gallery while the gallery's public read
 * API (`/api/x/originals/*`, today's app on the gallery host) answers; with the gallery stopped the
 * product page draws no link and is otherwise whole — never an error, never a long wait (the shop's
 * client gives up after 1.5 s).
 *
 * `E2E_GALLERY` says which state this run set up — `up` or `down` — and the spec first checks the
 * gallery really is so; without it the spec skips. Each state on a freshly started shop server: the
 * shop keeps a gallery answer for hours and no answer for a minute (`apps/shop/src/originals/cached.ts`).
 * The products are the ones with an original's stock number (`originalStockNumber`), read through
 * the owner's REST; the gallery's own answer for each number says which ones should link.
 */
import { request as httpRequest } from 'node:http'

import { expect, test, type APIRequestContext } from '@playwright/test'

import { axeClean, noOverflow, record, shot, SHOP_ORIGIN, staffApi, WIDTHS } from './support'

const STATE = process.env.E2E_GALLERY
const GALLERY = new URL(process.env.E2E_GALLERY_ORIGIN ?? 'http://gallery.localhost:4880')

test.skip(
  STATE !== 'up' && STATE !== 'down',
  'set E2E_GALLERY=up|down for the state this run set up',
)

/** The gallery's answer for a stock number: its status, or 0 when nothing answers. */
function galleryStatus(stockNumber: string): Promise<number> {
  return new Promise((resolve) => {
    const sent = httpRequest(
      {
        host: '127.0.0.1',
        port: Number(GALLERY.port),
        path: `/api/x/originals/${encodeURIComponent(stockNumber)}?locale=en`,
        headers: { host: GALLERY.host, accept: 'application/json' },
        timeout: 5_000,
      },
      (response) => {
        response.resume()
        resolve(response.statusCode ?? 0)
      },
    )
    sent.on('timeout', () => sent.destroy())
    sent.on('error', () => resolve(0))
    sent.end()
  })
}

type Made = { slug: string; originalStockNumber: string; galleryStatus: number }
let made: Made[] = []
let owner: APIRequestContext
test.beforeAll(async () => {
  owner = await staffApi('owner')
  const answer = await owner.get(
    '/api/products?depth=0&limit=20&where[_status][equals]=published&where[originalStockNumber][exists]=true',
  )
  const { docs } = (await answer.json()) as {
    docs: { slug: string; originalStockNumber: string | null }[]
  }
  for (const doc of docs.filter((each) => each.originalStockNumber)) {
    const number = doc.originalStockNumber as string
    made.push({
      slug: doc.slug,
      originalStockNumber: number,
      galleryStatus: await galleryStatus(number),
    })
  }
  made = made.slice(0, 4)
  expect(made.length, 'products made from an original').toBeGreaterThan(0)
})
test.afterAll(async () => {
  await owner.dispose()
})

test(`the product page with the gallery ${STATE}`, async ({ page }) => {
  if (STATE === 'up') {
    expect(
      made.some((each) => each.galleryStatus === 200),
      'the gallery knows one',
    ).toBe(true)
  } else {
    expect(
      made.every((each) => each.galleryStatus === 0),
      'the gallery answers nothing',
    ).toBe(true)
  }
  const seen: Record<string, unknown> = {}
  for (const product of made) {
    const linked = product.galleryStatus === 200
    for (const viewport of WIDTHS) {
      await page.setViewportSize(viewport)
      const started = Date.now()
      const answer = await page.goto(`${SHOP_ORIGIN}/product/${product.slug}`)
      const ms = Date.now() - started
      expect(answer?.status(), `${product.slug}: the page itself`).toBe(200)
      await expect(page.getByRole('button', { name: 'Add to bag' })).toBeVisible()
      // Streamed: React moves the slot's answer in from a hidden copy, so read it once settled.
      await page.waitForLoadState('networkidle').catch(() => undefined)
      const line = page.locator('[data-original-link]')
      if (linked) {
        await expect(line).toHaveCount(1)
        await expect(line).toBeVisible()
        const link = line.getByRole('link', { name: 'See the original' })
        const href = (await link.getAttribute('href')) ?? ''
        expect(new URL(href).origin, 'the work’s page, on the gallery’s origin').toBe(
          GALLERY.origin,
        )
        await expect(link).toHaveAttribute('target', '_blank')
        await line.scrollIntoViewIfNeeded()
        seen[`${product.originalStockNumber}@${viewport.width}`] = { href, ms }
      } else {
        await expect(line).toHaveCount(0)
        seen[`${product.originalStockNumber}@${viewport.width}`] = { link: null, ms }
      }
      // No answer costs at most the client's 1.5 s once a minute; nothing near a failure.
      expect(
        ms,
        `${product.slug} at ${viewport.width}: served without waiting on the gallery`,
      ).toBeLessThan(15_000)
      await noOverflow(page, `${product.slug} at ${viewport.width}`)
      await axeClean(page, `${product.slug} at ${viewport.width}`)
      const name = `original-${STATE}-${linked ? 'linked' : 'unlinked'}-${viewport.width}`
      await page.screenshot({ path: shot(name, test.info().outputDir) })
    }
  }
  await record(`originals.${STATE}`, { products: made, seen })
})
