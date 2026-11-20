/**
 * Live Preview of a shop page in the admin (TASKS.md 27.5.a): the page beside its editor, at a
 * phone's 390 px and a desktop's 1280 px, drawn by the shop itself on its own origin — so what the
 * admin shows is what the site shows.
 *
 * The frame opens `/api/x/preview?path=…` on the shop's origin (the admin's, `ADMIN_HOST`), which
 * switches Next's draft mode on only for the signed-in owner or editor whose session cookie comes
 * with it, then sends the frame to the page's own address; the page reads its latest draft as that
 * user. A save refreshes the frame (Payload's server-side Live Preview). A gallery page, a page not
 * yet saved, or a site whose hosts are not configured gets no preview. In the shop's own CMS every
 * page is the shop's (`siteless`: its pages carry no `site`).
 */
import { createHref, appOrigin, SITES, type SiteLocale } from '@engine/config/sites'
import type { CollectionConfig, LivePreviewConfig } from 'payload'

import { recordsCarrySite } from '../../site'

/** The widths the admin offers, as the site is checked (DESIGN-SYSTEM.md §3). */
export const PREVIEW_BREAKPOINTS = [
  { name: 'phone', label: 'Phone · 390', width: 390, height: 844 },
  { name: 'desktop', label: 'Desktop · 1280', width: 1280, height: 800 },
] as const

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const NAMED = new Set(['home', 'partnership', 'stores'])

/** A shop page's public path in `locale`: the named pages their own, any other `/{slug}`. */
export function shopPagePath(slug: string, locale: SiteLocale): string {
  const href = createHref(SITES.shop) as (surface: string, params: object, at: SiteLocale) => string
  return NAMED.has(slug) ? href(slug, {}, locale) : href('page', { slug }, locale)
}

/** The frame's address for a page's data, or `null` when it has no preview. */
export function previewUrlOf(
  data: { site?: unknown; slug?: unknown } | undefined,
  locale: unknown,
  origin: string | null = appOrigin('shop'),
  siteless = false,
): string | null {
  if (origin === null || (!siteless && data?.site !== 'shop')) return null
  const slug = typeof data?.slug === 'string' ? data.slug : ''
  if (!SLUG.test(slug)) return null
  const at: SiteLocale = locale === 'id' ? 'id' : 'en'
  return `${origin}/api/x/preview?path=${encodeURIComponent(shopPagePath(slug, at))}`
}

export const SHOP_PAGE_PREVIEW: LivePreviewConfig = {
  breakpoints: PREVIEW_BREAKPOINTS.map((breakpoint) => ({ ...breakpoint })),
  url: ({ data, locale, req }) =>
    previewUrlOf(data, locale?.code, undefined, !recordsCarrySite(req?.payload, 'pages')),
}

/** `collection` with the shop page preview on its edit view (admin wiring only: no field changes). */
export function withShopPagePreview<C extends CollectionConfig>(collection: C): C {
  return { ...collection, admin: { ...collection.admin, livePreview: SHOP_PAGE_PREVIEW } }
}
