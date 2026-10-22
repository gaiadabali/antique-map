// The 9.3.d crawl judgement (TASKS.md 9.3.d, EXPERIENCE-* §SEO): every sitemap URL answers 200, and
// every page carries a canonical, both hreflang alternates plus x-default, and a description; on the
// gallery no JSON-LD block may contain a price or an `offers`. Pure functions over response bodies,
// so a test drives them with fixtures and a local server.
//
// The sitemap speaks the site's canonical origin (`origin`), while the crawl is pointed at what it
// can reach (`base`): every loc is rewritten onto the base with `toBase`; a loc on any other origin
// is a failure ("sitemap lists another origin") and is never requested. Reports keep canonical URLs.
import { isSensitive } from './sensitive.mjs'
import { toBase } from './to-base.mjs'

const LINK = /<link\b[^>]*>/gi
const META = /<meta\b[^>]*>/gi
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:]*)\s*=\s*"([^"]*)"/g
const LD = /<script\b[^>]*type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi

function attributes(tag) {
  const map = {}
  ATTR.lastIndex = 0
  for (let m = ATTR.exec(tag); m !== null; m = ATTR.exec(tag)) map[m[1].toLowerCase()] = m[2]
  return map
}

/** The head links of a page: `[{ rel, href, hreflang }]`. */
export function headLinks(html) {
  const links = []
  for (const tag of html.match(LINK) ?? []) {
    const attrs = attributes(tag)
    if (attrs.rel)
      links.push({ rel: attrs.rel.toLowerCase(), href: attrs.href ?? '', hreflang: attrs.hreflang })
  }
  return links
}

/** The page's `<meta name="description">`, trimmed; `''` when absent or empty. */
export function metaDescription(html) {
  for (const tag of html.match(META) ?? []) {
    const attrs = attributes(tag)
    if ((attrs.name ?? '').toLowerCase() === 'description') return (attrs.content ?? '').trim()
  }
  return ''
}

/** Every `application/ld+json` block on the page, parsed; an unparsable block is reported as a string. */
export function jsonLdBlocks(html) {
  const blocks = []
  LD.lastIndex = 0
  for (let m = LD.exec(html); m !== null; m = LD.exec(html)) {
    try {
      blocks.push(JSON.parse(m[1]))
    } catch {
      blocks.push({ __unparsable: m[1] })
    }
  }
  return blocks
}

/** Walks a JSON-LD value for a key named `offers` or `price` anywhere (the gallery's one rule). */
export function containsPricing(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null) return false
  if (seen.has(value)) return false
  seen.add(value)
  if (Array.isArray(value)) return value.some((item) => containsPricing(item, seen))
  for (const [key, nested] of Object.entries(value)) {
    const lower = key.toLowerCase()
    if (lower === 'offers' || lower === 'price') return true
    if (containsPricing(nested, seen)) return true
  }
  return false
}

/** One page's verdict: `{ url, problems }` — an empty `problems` is a pass. */
export function judgePage({ url, status, html, site, origin }) {
  const problems = []
  if (status !== 200) problems.push(`status ${status}`)
  const links = headLinks(html ?? '')
  const canonical = links.find((link) => link.rel === 'canonical')
  if (!canonical || canonical.href === '') problems.push('no canonical link')
  else if (!canonical.href.startsWith(origin))
    problems.push(`canonical is not ${origin}: ${canonical.href}`)

  const alternates = links.filter((link) => link.rel === 'alternate' && link.hreflang)
  const langs = new Set(alternates.map((link) => link.hreflang.toLowerCase()))
  for (const lang of ['en', 'id', 'x-default']) {
    if (!langs.has(lang)) problems.push(`no hreflang "${lang}" alternate`)
  }
  if (metaDescription(html ?? '') === '') problems.push('no meta description')

  if (site === 'gallery') {
    for (const block of jsonLdBlocks(html ?? '')) {
      if (containsPricing(block)) problems.push('gallery JSON-LD contains price or offers')
    }
  }
  return { url, problems }
}

/** `<loc>` entries of a sitemap (or of each child in a sitemap index), XML-unescaped. */
export function sitemapLocations(xml) {
  const locs = []
  const RE = /<loc>([\s\S]*?)<\/loc>/gi
  for (let m = RE.exec(xml); m !== null; m = RE.exec(xml)) locs.push(unescapeXml(m[1].trim()))
  return locs
}

/** True when the XML declares a sitemap index (a `<sitemapindex>` element). */
export function isSitemapIndex(xml) {
  return /<sitemapindex\b/i.test(xml)
}

function unescapeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/** Counts URLs per locale by their path prefix (`/id/…` is Indonesian). */
export function localeCounts(urls) {
  let en = 0
  let id = 0
  for (const url of urls) {
    if (new URL(url).pathname.startsWith('/id/') || new URL(url).pathname === '/id') id += 1
    else en += 1
  }
  return { en, id }
}

/**
 * Splits sitemap locs into the ones on `origin` (mapped onto `base`, ready to request) and the
 * foreign ones. `requested` is `[{ url, req }]` (canonical URL plus the base URL to request);
 * `foreign` is the raw locs on another origin, which the caller turns into failures.
 */
export function resolveLocs(locs, { origin, base }) {
  const requested = []
  const foreign = []
  for (const loc of locs) {
    const mapped = toBase(loc, { origin, base })
    if (mapped.foreign) foreign.push(loc)
    else requested.push({ url: loc, req: mapped.url })
  }
  return { requested, foreign }
}

/**
 * Every page a site's sitemap lists, following an index's children through the base. Returns
 * `{ sitemaps, pages, failures }`; `pages` is `[{ url, req }]`. Throws a readable Error when the
 * sitemap itself or a child does not answer 200. A foreign loc (on another origin) is never
 * requested; it becomes a failure `{ url, problems: ['sitemap lists another origin'] }`.
 */
export async function collectSitemapUrls({ origin, base, get }) {
  const sitemapUrl = `${base}/sitemap.xml`
  const sitemap = await get(sitemapUrl)
  if (sitemap.status !== 200) throw new Error(`/sitemap.xml answered ${sitemap.status}`)

  const sitemaps = [sitemapUrl]
  const pages = []
  const failures = []
  const addForeign = (locs) => {
    for (const loc of locs) failures.push({ url: loc, problems: ['sitemap lists another origin'] })
  }

  if (isSitemapIndex(sitemap.body)) {
    const children = resolveLocs(sitemapLocations(sitemap.body), { origin, base })
    addForeign(children.foreign)
    for (const child of children.requested) {
      const res = await get(child.req)
      if (res.status !== 200) throw new Error(`sitemap child ${child.url} answered ${res.status}`)
      sitemaps.push(child.url)
      const inner = resolveLocs(sitemapLocations(res.body), { origin, base })
      addForeign(inner.foreign)
      pages.push(...inner.requested)
    }
  } else {
    const direct = resolveLocs(sitemapLocations(sitemap.body), { origin, base })
    addForeign(direct.foreign)
    pages.push(...direct.requested)
  }
  return { sitemaps, pages, failures }
}

/**
 * Crawls each page under the limiter, resuming from `done` (a Map from canonical URL to a judged
 * result). Returns `{ checked, skippedSensitive, failures }`; `write(url, result)` persists a fresh
 * answer. A sensitive path is skipped and counted, never requested.
 */
export async function crawlPages(pages, { get, site, origin, done = new Map(), write = () => {} }) {
  const failures = []
  let skippedSensitive = 0
  let checked = 0
  for (const page of pages) {
    if (isSensitive(new URL(page.url).pathname)) {
      skippedSensitive += 1
      continue
    }
    let result = done.get(page.url)
    if (result === undefined) {
      const res = await get(page.req)
      result = judgePage({ url: page.url, status: res.status, html: res.body, site, origin })
      write(page.url, result)
    }
    checked += 1
    if (result.problems.length > 0) failures.push(result)
  }
  return { checked, skippedSensitive, failures }
}
