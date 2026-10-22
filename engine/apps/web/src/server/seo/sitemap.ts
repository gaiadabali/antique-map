/**
 * Pure sitemap builders (9.3fix): each published record is a `SitemapEntry` carrying both
 * locales' own translated paths (never one path with `/id` glued on — a site's Indonesian segment
 * is its own word). `buildSitemap` emits one `<url>` per locale per entry, each carrying `en`,
 * `id` and `x-default` `xhtml:link` alternates. Over `MAX_URLS_PER_SITEMAP` entries,
 * `buildSitemapIndex` + chunking (the route's job) replaces the single urlset.
 */
function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export type SitemapEntry = {
  readonly paths: Readonly<Record<'en' | 'id', string>>
  readonly lastModified?: Date
}

export const excludedPrefixes = ['/admin', '/api', '/track', '/checkout', '/bag', '/order'] as const

/** The number of `<url>` entries (one per locale) a single sitemap file may hold before the route
 * must split into a sitemap index (the sitemaps protocol's own 50,000-URL cap, kept at 45,000). */
export const MAX_URLS_PER_SITEMAP = 45_000

export function isIndexable(path: string): boolean {
  const normalized = path === '' ? '/' : path
  return !excludedPrefixes.some((prefix) => normalized.startsWith(prefix))
}

export function buildSitemap(entries: readonly SitemapEntry[], origin: string): string {
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
  ]

  for (const entry of entries) {
    if (!isIndexable(entry.paths.en)) continue
    for (const locale of ['en', 'id'] as const) {
      lines.push('  <url>')
      lines.push(`    <loc>${xmlEscape(`${origin}${entry.paths[locale]}`)}</loc>`)
      for (const alt of ['en', 'id'] as const) {
        lines.push(
          `    <xhtml:link rel="alternate" hreflang="${alt}" href="${xmlEscape(`${origin}${entry.paths[alt]}`)}" />`,
        )
      }
      lines.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(`${origin}${entry.paths.en}`)}" />`,
      )
      if (entry.lastModified) {
        lines.push(`    <lastmod>${entry.lastModified.toISOString().split('T')[0]}</lastmod>`)
      }
      lines.push('  </url>')
    }
  }

  lines.push('</urlset>')
  return lines.join('\n') + '\n'
}

/** A sitemap index pointing at each chunk's own file name (`sitemap-1.xml`, `sitemap-2.xml`, …). */
export function buildSitemapIndex(names: readonly string[], origin: string): string {
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ]
  for (const name of names) {
    lines.push('  <sitemap>', `    <loc>${xmlEscape(`${origin}/${name}`)}</loc>`, '  </sitemap>')
  }
  lines.push('</sitemapindex>')
  return lines.join('\n') + '\n'
}

/** `entries` split into chunks, each holding at most `MAX_URLS_PER_SITEMAP` locale URLs (two per
 * entry), so no single file can cross the sitemaps protocol's cap. */
export function chunkEntries(
  entries: readonly SitemapEntry[],
  max: number = MAX_URLS_PER_SITEMAP,
): readonly (readonly SitemapEntry[])[] {
  const perChunk = Math.max(1, Math.floor(max / 2))
  const chunks: SitemapEntry[][] = []
  for (let index = 0; index < entries.length; index += perChunk) {
    chunks.push(entries.slice(index, index + perChunk))
  }
  return chunks.length > 0 ? chunks : [[]]
}
