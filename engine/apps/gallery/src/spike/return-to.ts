/**
 * Where a post goes back to (C13 `FORM_RESULT`'s `returnTo`): one of this brand's page addresses
 * (C10), else `/`. Root-relative only — `//host` and `/\host` are other sites to a browser
 * (MIGRATION.md §6) — and the rule is held on what was posted *and* on what the URL parser made of
 * it, since the redirect uses the latter: `/\t/evil.com` normalises to `//evil.com` (senior-fe #15).
 */
import { parsePublicPath, type ParseConfig } from '@engine/config/routes'

const ROOT_RELATIVE = /^\/(?![/\\])/

export function safeReturnTo(target: string, config: ParseConfig): string {
  if (!ROOT_RELATIVE.test(target)) return '/'
  const url = new URL(target, 'http://x')
  if (!ROOT_RELATIVE.test(url.pathname)) return '/'
  if (parsePublicPath(config, url.pathname).kind !== 'surface') return '/'
  return `${url.pathname}${url.search}`
}
