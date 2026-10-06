/** Every link a maker page carries (5.4.a): `href()` from the gallery's own route map, mirroring
 * `../browse/state-links.ts`'s own `createHref(SITES.gallery)` use. */
import type { SiteLocale } from '@engine/config/sites'
import { createHref, SITES } from '@engine/config/sites'

const href = createHref(SITES.gallery)

export function makerIndexHref(locale: SiteLocale): string {
  return href('maker', {}, locale)
}

export function makerHref(slug: string, locale: SiteLocale): string {
  return href('maker', { slug }, locale)
}
