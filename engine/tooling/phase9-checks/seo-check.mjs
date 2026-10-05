// The 9.3.d crawl judgement (TASKS.md 9.3.d, EXPERIENCE-* §SEO): every sitemap URL answers 200, and
// every page carries a canonical, both hreflang alternates plus x-default, and a description; on the
// gallery no JSON-LD block may contain a price or an `offers`. Pure functions over response bodies,
// so a test drives them with fixtures and a local server.
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
