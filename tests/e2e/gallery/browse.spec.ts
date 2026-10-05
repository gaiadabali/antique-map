/**
 * Gallery browse and search (TASKS.md 5.1.d): the four clauses of the Check, each proven on the
 * production build at this worktree's port.
 *
 * 1. A search for the historical place name **Batavia** finds an item catalogued under the modern
 *    place — the spec makes a published work under a place whose historical name is Batavia.
 * 2. A **draft** work is never listed — absent from browse, absent from a search for its own word;
 *    and present in the owner's REST read, so the fixture is shown to exist.
 * 3. The response body of browse and search carries **no `askingPrice`**, and no currency figure.
 * 4. **axe is clean** on browse and search at 390×844 and 1280×800.
 *
 * No conditional asserts: every claim fails when its data is missing. No `data-testid` — every
 * locator is a real role, a heading, or the lexicon's own text. The seed publishes nothing, so the
 * fixtures are made here (`./support/fixtures`) and removed in `afterAll`.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { GALLERY_ORIGIN } from './support/env'
import {
  createGalleryFixtures,
  ownerReadsTitle,
  type GalleryFixtures,
} from './support/fixtures'

const SHOTS = 'docs/reports/workers/ds-5.1d'
const BROWSE_PATH = '/browse'
const searchPath = (query: string) => `/search?q=${encodeURIComponent(query)}`

test.describe('Gallery browse and search (5.1.d)', () => {
  let fx: GalleryFixtures

  test.beforeAll(async ({ request }) => {
    fx = await createGalleryFixtures(request)
  })

  test.afterAll(async () => {
    await fx.cleanup()
  })

  test('search for the historical name "Batavia" finds the work catalogued under the modern place', async ({
    page,
  }) => {
    const response = await page.goto(`${GALLERY_ORIGIN}${searchPath('Batavia')}`)
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // The heading names the query back; the result grid is a list of cards, each a link whose
    // title is the work's own.
    await expect(page.getByText(fx.publishedTitle)).toBeVisible()
    await expect(page.getByRole('link', { name: new RegExp(fx.publishedTitle) })).toBeVisible()
  })

  test('a draft work is never listed in browse or search, yet the owner can read it', async ({
    page,
    request,
  }) => {
    // Present to the owner: the fixture really exists, and it is a draft.
    const own = await ownerReadsTitle(request, fx.draftTitle)
    expect(own.found, 'the owner reads the draft fixture').toBe(true)
    expect(own.status, 'the fixture is a draft').toBe('draft')

    // Absent from browse — the whole first page's markup carries no trace of its word.
    const browse = await page.goto(`${GALLERY_ORIGIN}${BROWSE_PATH}`)
    expect(browse?.status()).toBe(200)
    const browseHtml = await page.content()
    expect(browseHtml.includes(fx.draftTitle), 'browse lists no draft title').toBe(false)
    expect(browseHtml.includes(fx.draftWord), 'browse lists no draft word').toBe(false)

    // Absent from a search for its own distinctive word.
    const search = await page.goto(`${GALLERY_ORIGIN}${searchPath(fx.draftWord)}`)
    expect(search?.status()).toBe(200)
    const searchHtml = await page.content()
    expect(searchHtml.includes(fx.draftTitle), 'search finds no draft title').toBe(false)
    await expect(page.getByText(fx.draftTitle)).toHaveCount(0)
  })

  test('the browse and search responses carry no askingPrice and no currency figure', async ({
    page,
  }) => {
    const bodies: string[] = []
    page.on('response', async (res) => {
      const type = res.headers()['content-type'] ?? ''
      if (/text\/html|text\/x-component|application\/json/.test(type)) {
        bodies.push(await res.text().catch(() => ''))
      }
    })

    for (const path of [BROWSE_PATH, searchPath('Batavia')]) {
      const res = await page.goto(`${GALLERY_ORIGIN}${path}`)
      expect(res?.status(), path).toBe(200)
      // Let every streamed RSC/flight response land before its body is read below.
      await page.waitForLoadState('networkidle')
      bodies.push(await page.content())
    }

    const all = bodies.join('\n')
    expect(all.toLowerCase().includes('askingprice'), 'no askingPrice in any response').toBe(false)
    // The ticket's own pattern. `\b` before `$` keeps React's flight cell references (`"$1"`,
    // preceded by a quote) from reading as a figure, while `Rp…`/`US$…` amounts still match.
    expect(/\b(Rp|S\$|US\$|\$)\s?\d/.test(all), 'no currency figure in any response').toBe(false)
  })

  test('axe is clean on browse and search at 390 and 1280 px', async ({ page }) => {
    const check = async (path: string, width: number, label: string) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 800 })
      const res = await page.goto(`${GALLERY_ORIGIN}${path}`)
      expect(res?.status(), `${label} ${width}`).toBe(200)
      const { violations } = await new AxeBuilder({ page }).analyze()
      const found = violations.map(
        ({ id, impact, nodes }) =>
          `${impact ?? 'unknown'} ${id}: ${nodes.map((n) => n.target).join()}`,
      )
      // Print the ids so the report shows them even on a failure.
      if (found.length > 0) console.log(`axe ${label} ${width}:`, found)
      expect(found, `axe clean: ${label} ${width}`).toEqual([])
    }

    await check(BROWSE_PATH, 390, 'browse')
    await check(searchPath('Batavia'), 390, 'search')
    await shoot(page, 'search-batavia-390')
    await check(BROWSE_PATH, 1280, 'browse')
    await check(searchPath('Batavia'), 1280, 'search')
    await shoot(page, 'search-batavia-1280')
  })
})

/** One screenshot under the report folder — best-effort, never fails the test. */
async function shoot(page: Page, name: string) {
  const { mkdirSync } = await import('node:fs')
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, animations: 'disabled' })
}
