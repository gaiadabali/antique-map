/**
 * Pure sitemap builders. `buildSitemap` emits XML with `xhtml:link` alternates for `en` and `id`.
 *
 * Each input path is locale-agnostic; the output contains both `/path` and `/id/path` forms,
 * XML-escaped and with a trailing newline.
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
  readonly path: string
  readonly lastModified?: Date
}

export const excludedPrefixes = ['/admin', '/api', '/track', '/checkout', '/bag', '/order'] as const

function localeUrl(origin: string, path: string, locale: 'en' | 'id'): string {
  const prefix = locale === 'en' ? '' : '/id'
  const normalized = path === '/' ? '/' : path
  return `${origin}${prefix}${normalized}`
}

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
    if (!isIndexable(entry.path)) continue
    lines.push('  <url>')
    lines.push(`    <loc>${xmlEscape(localeUrl(origin, entry.path, 'en'))}</loc>`)
    for (const locale of ['en', 'id'] as const) {
      lines.push(
        `    <xhtml:link rel="alternate" hreflang="${locale}" href="${xmlEscape(localeUrl(origin, entry.path, locale))}" />`,
      )
    }
    if (entry.lastModified) {
      lines.push(`    <lastmod>${entry.lastModified.toISOString().split('T')[0]}</lastmod>`)
    }
    lines.push('  </url>')
  }

  lines.push('</urlset>')
  return lines.join('\n') + '\n'
}
