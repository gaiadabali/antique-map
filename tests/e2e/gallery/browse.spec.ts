/**
 * Gallery browse and search (TASKS.md 5.1.d): the four clauses of the Check, each proven on the
 * production build at this worktree's port.
 *
 * 1. A search for the historical place name **Batavia** finds an item catalogued under the modern
 *    place — and only through the gazetteer: nothing else on the work says Batavia.
 * 2. A **draft** work is never listed — not in browse, not in a search — while its published twin,
 *    identical but for `_status`, is; and a published work's newer draft revision stays unseen.
 * 3. The response bodies of browse and search (HTML, flight) carry **no `askingPrice`**, no asking
 *    price figure and no currency figure — although the listed work has an asking price.
 * 4. **axe is clean** on browse and search at 390×844 and 1280×800, with a result card on the page.
 *
 * Every page claim has a positive control (the published fixture is on the page), so no claim holds
 * because a page is empty or stale. Freshness: the fixtures are written moments before the pages are
 * read; a page that has not caught up within `FRESH` is a failure — the owner's publish must reach
 * the visitor, not after a cache lifetime.
 */
import AxeBuilder from '@axe-core/playwright'
import {
  expect,
  request as newRequest,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

import { BASE_URL, GALLERY_ORIGIN, PORT } from './support/env'
import {
  DRAFT_PRICE,
  PUBLISHED_PRICE,
  createGalleryFixtures,
  newLedger,
  ownerReadsWord,
  type GalleryFixtures,
  type Ledger,
} from './support/fixtures'

const SHOTS = 'docs/reports/workers/ds-5.1d'
/** How long a just-published work may take to reach the pages: the write's `after()` revalidation,
 * not a cache lifetime (`cacheLife` 'default' revalidates after 15 min). */
const FRESH = 30_000
// The four tests run in order on one worker even under the root config's `fullyParallel`: they
// share the fixtures, and parallel writers on the shared dev Postgres drop connections.
test.describe.configure({ mode: 'default' })
const BROWSE_PATH = '/browse'
const searchPath = (query: string) => `/search?q=${encodeURIComponent(query)}`
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** A price figure as a page could print it: plain, or grouped by `,` `.` or a space. */
const figure = (n: number) =>
  new RegExp(`(?<!\\d)${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '[,. \\u00a0]?')}(?!\\d)`)

/** Opens `path` on the gallery and waits until the published fixture's card is listed. */
async function openListing(page: Page, path: string, fx: GalleryFixtures) {
  await expect(async () => {
    const res = await page.goto(`${GALLERY_ORIGIN}${path}`)
    expect(res?.status(), path).toBe(200)
    await expect(
      page.getByRole('link', { name: new RegExp(escape(fx.publishedTitle)) }),
    ).toBeVisible({
      timeout: 2_000,
    })
  }, `${path} lists the work published moments ago (a stale cached listing fails here)`).toPass({
    timeout: FRESH,
  })
}

test.describe('Gallery browse and search (5.1.d)', () => {
  test.setTimeout(120_000)

  let fx: GalleryFixtures
  let api: APIRequestContext
  let ledger: Ledger

  test.beforeAll(async () => {
    test.setTimeout(120_000)
    api = await newRequest.newContext({ baseURL: BASE_URL })
    ledger = newLedger(api)
    fx = await createGalleryFixtures(api, ledger)
  })

  test.afterAll(async () => {
    test.setTimeout(120_000)
    try {
      await ledger?.cleanup()
    } finally {
      await api?.dispose()
    }
  })

  test('search for the historical name "Batavia" finds the work catalogued under the modern place', async ({
    page,
  }) => {
    // Nothing but the place's historical name says Batavia: the match is the gazetteer's.
    expect(fx.publishedTitle.toLowerCase()).not.toContain('batavia')
    await openListing(page, searchPath('Batavia'), fx)
    // The draft twin sits under the same place and is not found through it either.
    await expect(page.getByRole('link', { name: new RegExp(escape(fx.draftTitle)) })).toHaveCount(0)
  })

  test('a draft work is never listed in browse or search, yet the owner can read it', async ({
    page,
  }) => {
    // The fixtures exist as drafts: the twin, and the published work's newer revision.
    const draft = await ownerReadsWord(api, fx.draftWord)
    expect(draft).toEqual({ titles: [fx.draftTitle], statuses: ['draft'] })
    const revision = await ownerReadsWord(api, fx.revisionWord)
    expect(revision.statuses, 'the published work has a newer draft revision').toEqual(['draft'])

    const absent = async (where: string) => {
      const html = await page.content()
      expect(html.includes(fx.draftTitle), `${where}: no draft title`).toBe(false)
      // The revision's title, never its bare word: a search page echoes its own query.
      const revised = `${fx.publishedTitle} ${fx.revisionWord}`
      expect(html.includes(revised), `${where}: no draft revision`).toBe(false)
    }

    // Browse, newest first: the draft is newer than the listed published twin.
    await openListing(page, BROWSE_PATH, fx)
    await absent('browse')
    expect((await page.content()).includes(fx.draftWord), 'browse: no draft word').toBe(false)

    // A word both titles carry: the published twin is found, the draft is not.
    await openListing(page, searchPath(fx.pairWord), fx)
    await absent(`search ${fx.pairWord}`)

    // The draft's own word, and the revision's own word, find nothing at all.
    for (const word of [fx.draftWord, fx.revisionWord]) {
      const res = await page.goto(`${GALLERY_ORIGIN}${searchPath(word)}`)
      expect(res?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('link', { name: /E2E (Draft|Harbour)/ })).toHaveCount(0)
      await absent(`search ${word}`)
    }
  })

  test('the browse and search responses carry no askingPrice and no currency figure', async ({
    page,
  }) => {
    const bodies: string[] = []
    const pending: Promise<void>[] = []
    page.on('response', (res) => {
      const type = res.headers()['content-type'] ?? ''
      if (/text\/html|text\/x-component|application\/json/.test(type)) {
        pending.push(
          res.text().then(
            (text) => void bodies.push(text),
            () => {},
          ),
        )
      }
    })

    const paths = [BROWSE_PATH, searchPath('Batavia'), searchPath(fx.pairWord)]
    for (const path of paths) {
      await openListing(page, path, fx)
      await page.waitForLoadState('networkidle')
      bodies.push(await page.content())
    }
    await Promise.all(pending)

    // The flight (RSC) payload of each page, asked for as a client navigation would.
    for (const path of paths) {
      const res = await api.get(`${BASE_URL}${path}`, {
        headers: { Host: `gallery.localhost:${PORT}`, RSC: '1' },
      })
      expect(res.status(), `RSC ${path}`).toBe(200)
      expect(res.headers()['content-type'], `RSC ${path}`).toContain('text/x-component')
      const flight = await res.text()
      expect(flight, `RSC ${path} carries the listed work`).toContain(fx.publishedTitle)
      bodies.push(flight)
    }

    const all = bodies.join('\n')
    expect(all, 'the captured bodies hold the listed work').toContain(fx.publishedTitle)
    expect(all.toLowerCase().includes('askingprice'), 'no askingPrice in any response').toBe(false)
    expect(figure(PUBLISHED_PRICE).test(all), 'no asking price figure').toBe(false)
    expect(figure(DRAFT_PRICE).test(all), 'no draft asking price figure').toBe(false)
    // The ticket's pattern, with a bare `$` amount too (`\b` cannot precede a `$` after a space);
    // a flight cell reference (`"$1"`, `$L2`) follows a quote or a letter, never a space.
    expect(/\b(Rp|S\$|US\$)\s?\d|(^|[\s>(])\$\s?\d/.test(all), 'no currency figure').toBe(false)
  })

  test('axe is clean on browse and search at 390 and 1280 px', async ({ page }) => {
    const check = async (path: string, width: number, label: string) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 800 })
      await openListing(page, path, fx)
      const { violations } = await new AxeBuilder({ page }).analyze()
      const found = violations.map(
        ({ id, impact, nodes }) =>
          `${impact ?? 'unknown'} ${id}: ${nodes.map((n) => n.target).join()}`,
      )
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

/** One screenshot under the report folder. */
async function shoot(page: Page, name: string) {
  const { mkdirSync } = await import('node:fs')
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, animations: 'disabled' })
}
