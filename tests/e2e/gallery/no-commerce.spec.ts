/**
 * The gallery's "no commerce" scan (TASKS.md 5.5.b; EXPERIENCE-GALLERY.md §12 "Deliberately absent").
 *
 * The gallery is enquiry-only: its built HTML must contain no cart, checkout, sign-in, price or
 * "offer" on any page a visitor can reach. This spec loads every reachable gallery page at 390x844
 * (phone first) in a real browser, reads the rendered DOM's visible text and the attribute values
 * `terms.ts` names, and fails with `page -> term -> snippet` if any banned term appears. It also
 * reads the raw server HTML (`request.get`) of the same pages for the internal `askingPrice` field
 * and any currency figure.
 *
 * The pages are DISCOVERED, not hard-coded: the route map (`SITES.gallery.routes`) builds every URL
 * via `href()`, browse's links supply the item pages, and `/makers` `/places`' own links supply the
 * maker and place pages. A route that answers 404 today because its phase-5 task (5.2 item, 5.3
 * sell-to-us, 5.4 maker/place) has not merged is listed as "not built yet" — the ONE allowed skip,
 * which the spec prints so the report shows it. Home, browse, search and at least one item page must
 * answer 200, or the scan fails: those are the pages a visitor reaches first.
 *
 * Port and host follow `playwright.config.ts`: `E2E_PORT` names this worktree's port, Chromium
 * resolves `*.localhost`, and the `request` fixture (Node's resolver) reaches the vhost by loopback
 * IP plus a `Host` header. The hostname comes from the committed `SITES`, never a hard-coded string.
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// Relative, like `playwright.config.ts`: the repo root has no `@engine/config` link (`@engine/*`
// resolves inside the apps, not here), so a root-level spec imports the source directly.
import { createHref } from '../../../engine/packages/config/src/sites/routes/href'
import { SITES } from '../../../engine/packages/config/src/sites/table'
import {
  ALLOWED_PRICE_PHRASES,
  ATTRIBUTES,
  BANNED_HREFS,
  BANNED_INTERNAL,
  BANNED_WORDS,
  type BannedTerm,
} from './no-commerce/terms'

const PORT = process.env.E2E_PORT ?? '4200'
const HOST = process.env.E2E_GALLERY_HOST ?? SITES.gallery.hostnames.local[0]
const BASE_URL = `http://127.0.0.1:${PORT}`
const ORIGIN = `http://${HOST}:${PORT}`
const HOST_HEADER = { Host: `${HOST}:${PORT}` }

const href = createHref(SITES.gallery)
const LOCALES = SITES.gallery.locales.supported

/** A path that is not a gallery page: the spec scans whatever the server answers for it (the 404). */
const NOT_FOUND_PATH = '/no-such-page-zzzz'

/**
 * A page the scan loads: its URL, whether it is one of the four a visitor reaches first, and — for
 * the not-found probe — whether it is scanned even though it answers 404 (the ticket asks for the
 * 404 page itself to be scanned for banned terms, not merely listed).
 */
type Target = { readonly path: string; readonly required: boolean; readonly scanAt404?: true }

/**
 * The fixed pages (the ticket's list), for both locales. `/about`, `/guarantee`, `/certificate`,
 * `/condition`, `/shipping`, `/visit`, `/contact` are CMS pages at their own slug (`page` surface);
 * `/sell-to-us`, `/makers`, `/places` are their own surfaces. `/makers` `/places` index and the
 * item/maker/place detail pages are added during discovery.
 */
function fixedTargets(locale: (typeof LOCALES)[number]): Target[] {
  const page = (slug: string): string => href('page', { slug }, locale)
  return [
    { path: href('home', {}, locale), required: true },
    { path: href('browse', {}, locale), required: true },
    { path: href('search', { q: 'java' }, locale), required: true },
    { path: href('search', { q: 'zzzzqqq' }, locale), required: false },
    { path: href('sellToUs', {}, locale), required: false },
    { path: href('maker', {}, locale), required: false },
    { path: href('place', {}, locale), required: false },
    ...[
      'about',
      'guarantee',
      'certificate',
      'condition',
      'shipping',
      'visit',
      'contact',
    ].map((slug) => ({ path: page(slug), required: false })),
    // The 404 the gallery shows for a missing path: scanned, not listed as "not built yet".
    { path: NOT_FOUND_PATH, required: false, scanAt404: true },
  ]
}

/** The item-segment prefix of a locale: `/product` (en) or `/produk` (id) — from the route map. */
const itemPrefix = (locale: (typeof LOCALES)[number]): string =>
  href('item', { publicId: 0, slug: '' }, locale).replace(/\/0$/, '')

/** Collects the `href` values of every link on a page whose path starts with `prefix`. */
async function linksUnder(
  page: Page,
  prefix: string,
  limit: number,
): Promise<string[]> {
  const hrefs = await page
    .locator(`a[href^="${prefix}"]`)
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href') ?? ''))
  return [...new Set(hrefs.filter((h) => h.startsWith(prefix)))].slice(0, limit)
}

/**
 * Every page to scan, discovered per locale: the fixed list, then the item pages from browse's own
 * links, then the maker and place pages from the indexes' own links (only if each index answers 200).
 */
async function discover(page: Page, request: APIRequestContext): Promise<Target[]> {
  const targets: Target[] = []
  const seen = new Set<string>()
  const add = (path: string, required: boolean) => {
    if (seen.has(path)) return
    seen.add(path)
    targets.push({ path, required })
  }

  for (const locale of LOCALES) {
    for (const t of fixedTargets(locale)) add(t.path, t.required)

    const browsePath = href('browse', {}, locale)
    const browseStatus = await statusOf(request, browsePath)
    if (browseStatus === 200) {
      await page.goto(`${ORIGIN}${browsePath}`, { waitUntil: 'domcontentloaded' })
      const items = await linksUnder(page, itemPrefix(locale), 10)
      // The first item page is required: a visitor reaching browse must reach a work from it.
      items.forEach((p, i) => add(p, i === 0))
    }

    for (const surface of ['maker', 'place'] as const) {
      const index = href(surface, {}, locale)
      if ((await statusOf(request, index)) !== 200) continue
      await page.goto(`${ORIGIN}${index}`, { waitUntil: 'domcontentloaded' })
      const links = await linksUnder(page, `${href(surface, {}, locale)}/`, 30)
      links.forEach((p) => add(p, false))
    }
  }
  return targets
}

/** The server status of a path, through the `request` fixture (loopback IP + Host header). */
async function statusOf(request: APIRequestContext, path: string): Promise<number> {
  const res = await request.get(`${BASE_URL}${path}`, { headers: HOST_HEADER })
  return res.status()
}

/** One banned term found on one page, with the snippet around it for the report. */
type Violation = { readonly page: string; readonly term: string; readonly snippet: string }

/** Replaces the allowed price wording with a neutral token, so only other price uses fail. */
function maskAllowed(text: string): string {
  let out = text
  for (const phrase of ALLOWED_PRICE_PHRASES) {
    out = out.replaceAll(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '\u0000')
  }
  return out
}

/** Tests one banned term against a page's haystack, recording every hit with a 40-char snippet. */
function scan(
  label: string,
  term: BannedTerm,
  haystack: string,
  violations: Violation[],
): void {
  const re = new RegExp(term.pattern, 'gi')
  for (const match of haystack.matchAll(re)) {
    const at = match.index ?? 0
    const snippet = haystack.slice(Math.max(0, at - 20), at + match[0].length + 20).trim()
    violations.push({ page: label, term: term.label, snippet })
  }
}

/** Loads a page in the browser and returns { text, attrs } — the rendered DOM the scan reads. */
async function readable(page: Page, path: string): Promise<{ text: string; attrs: string[] }> {
  await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' })
  const text = await page.locator('body').innerText()
  const attrs = await page
    .locator('body [href], body [aria-label], body [title], body [alt], body [placeholder], body [value]')
    .evaluateAll(
      (nodes, names) =>
        nodes.flatMap((node) => names.map((name) => node.getAttribute(name))),
      ATTRIBUTES as unknown as string[],
    )
    .then((values) => values.filter((v): v is string => v !== null && v !== ''))
  return { text: maskAllowed(text), attrs: attrs.map(maskAllowed) }
}

test.describe('Gallery: no commerce anywhere (5.5.b)', () => {
  test('no banned term on any reachable page; home, browse, search and an item are 200', async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    const targets = await discover(page, request)
    const notBuiltYet: string[] = []
    const reached: string[] = []
    const violations: Violation[] = []

    for (const { path, required, scanAt404 } of targets) {
      const status = await statusOf(request, path)
      const ok = status === 200
      if (!ok && !scanAt404) {
        if (required) {
          // The four pages a visitor reaches first: a non-200 here is a hard failure.
          throw new Error(`required page ${path} answered ${status}, not 200`)
        }
        notBuiltYet.push(`${path} (HTTP ${status})`)
        continue
      }
      reached.push(ok ? path : `${path} (HTTP ${status})`)

      const { text, attrs } = await readable(page, path)
      for (const term of BANNED_WORDS) scan(`${path} [text]`, term, text, violations)
      for (const term of BANNED_WORDS) scan(`${path} [attr]`, term, attrs.join('\n'), violations)
      for (const term of BANNED_HREFS) scan(`${path} [attr]`, term, attrs.join('\n'), violations)

      // Raw server HTML: the internal price field and any currency figure never reach a visitor.
      const raw = await request.get(`${BASE_URL}${path}`, { headers: HOST_HEADER })
      const html = maskAllowed(await raw.text())
      if (html.includes(BANNED_INTERNAL)) {
        violations.push({
          page: `${path} [raw]`,
          term: BANNED_INTERNAL,
          snippet: html.slice(html.indexOf(BANNED_INTERNAL) - 20, html.indexOf(BANNED_INTERNAL) + 20),
        })
      }
      for (const term of BANNED_WORDS.filter((t) => t.label === 'currency figure')) {
        scan(`${path} [raw]`, term, html, violations)
      }
    }

    // The report shows both lists; the "not built yet" list is the only allowed skip.
    console.log(`scanned ${reached.length} pages:`)
    for (const p of reached) console.log(`  ok   ${p}`)
    console.log(`not built yet (${notBuiltYet.length}):`)
    for (const p of notBuiltYet) console.log(`  skip ${p}`)

    const lines = violations.map((v) => `${v.page} -> ${v.term} -> "${v.snippet}"`)
    expect(
      violations,
      `banned commerce terms found on the gallery:\n${lines.join('\n')}`,
    ).toEqual([])

    // A visitor reaching browse must reach a work: at least one item page was scanned.
    const items = reached.filter((p) => p.startsWith(itemPrefix('en')) || p.startsWith(itemPrefix('id')))
    expect(items.length, 'at least one gallery item page was scanned (200)').toBeGreaterThan(0)
  })
})
