/**
 * Which address `/api/x/preview` may send a staff member to (TASKS.md 27.5.a): a shop page's own
 * public path — the home, the partnership page, the stores page or a CMS page at `/{slug}` — in
 * either language, and nothing else. Never an absolute URL, `//elsewhere` or a path the shop's
 * route map does not name: the route is no open redirect. Pure.
 */
import { parsePublicPath, SITES } from '@engine/config/sites'

const PREVIEWABLE = new Set(['home', 'partnership', 'stores', 'page'])

/** `raw` when it is a previewable shop page's path, else `null`. */
export function previewPath(raw: string | null): string | null {
  if (raw === null || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return null
  }
  if (/[?#\s]/.test(raw) || raw.length > 300) return null
  const parsed = parsePublicPath(SITES.shop, raw)
  return parsed.kind === 'surface' && PREVIEWABLE.has(parsed.surface) ? raw : null
}

/** Any shop path, for leaving preview where one was: a surface the route map names, else home. */
export function returnPath(raw: string | null): string {
  if (raw === null || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/'
  if (/[?#\s]/.test(raw) || raw.length > 300) return '/'
  return parsePublicPath(SITES.shop, raw).kind === 'surface' ? raw : '/'
}
