/**
 * The gallery item page (5.2.b). Its public address is `/product/{publicId}-{slug}` (`/id/produk/…`
 * in Indonesian, EXPERIENCE-GALLERY.md §2); the proxy rewrites it to this route, the item
 * surface's internal folder `item/[idSlug]` (`SURFACE_ROUTES.item`, `parsePublicPath()`), so the
 * folder is named for the route table, never for the public segment.
 *
 * One address per work: an address with no slug, a stale slug or an old site's spelling answers
 * **308** to the canonical one (`permanentRedirect`); an id that names no published work is
 * `notFound()`. The page is a thin composition: the read is `loadItem()` (published-only,
 * projected, price-free), the sections live in `sites/gallery/item/*`, and `generateMetadata`
 * calls the 9.3 SEO library.
 */
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'

import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import { loadItem } from '../../../../../../server/gallery/item/load-item'
import type { ItemView } from '../../../../../../server/gallery/item/view-model'
import { pageMetadata } from '../../../../../../server/seo'
import { loadSiteSettings } from '../../../../../../server/site-settings'
import { siteLocale } from '../../../../../../shell/messages'
import { currentSite } from '../../../../../../shell/site'
import {
  itemMessage,
  soldMessage,
  talkLinks,
} from '../../../../../../sites/gallery/contact/handoff'
import { contactText } from '../../../../../../sites/gallery/contact/messages'
import { itemText } from '../../../../../../sites/gallery/item/copy'
import { ItemViewComposition } from '../../../../../../sites/gallery/item/item-view'

type Props = PageProps<'/gallery/[locale]/item/[idSlug]'>

const href = createHref(SITES.gallery)

/** The id–slug segment: the id resolves the work, the slug is words for people. Any slug is
 * read — an old site's spelling too — so a wrong one redirects rather than 404s. */
function parseIdSlug(raw: string): { publicId: string; slug: string } | null {
  const match = /^([1-9]\d{0,8})(?:-(.*))?$/s.exec(raw)
  if (match === null) return null
  return { publicId: match[1]!, slug: match[2] ?? '' }
}

const itemHref = (work: ItemView, locale: SiteLocale) =>
  href('item', { publicId: work.publicId, slug: work.slug }, locale)

async function itemOf(props: Props) {
  const { locale: raw, idSlug } = await props.params
  const locale = siteLocale('gallery', raw)
  const parsed = parseIdSlug(idSlug)
  if (locale === null || parsed === null) return null
  const work = await loadItem(parsed.publicId, locale, itemText(locale)('item.dateUnknown'))
  return work === null ? null : { locale, parsed, work }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [page, site] = await Promise.all([itemOf(props), currentSite('gallery')])
  if (page === null || site.origin === null) return {}
  const { locale, work } = page
  const t = itemText(locale)
  const byline = [work.maker?.name, work.date].filter(Boolean).join(', ')
  const lead = work.images[work.primaryIndex]
  const metadata = pageMetadata({
    site: 'gallery',
    locale,
    path: itemHref(work, locale),
    title: byline !== '' ? `${work.title} – ${byline}` : work.title,
    description: [work.originalTitle ?? work.title, t('price.onRequest')].join(' · '),
    image:
      lead !== undefined
        ? {
            url: lead.url,
            alt: lead.alt,
            ...(lead.width !== null ? { width: lead.width } : {}),
            ...(lead.height !== null ? { height: lead.height } : {}),
          }
        : undefined,
    origin: site.origin,
  })
  // The library prefixes `/id` to one path for both languages; the item's segment is translated
  // (`/product` · `/id/produk`), so each language's address comes from `href()` itself.
  const at = (l: SiteLocale) => `${site.origin}${itemHref(work, l)}`
  return {
    ...metadata,
    alternates: {
      canonical: at(locale),
      languages: { en: at('en'), id: at('id'), 'x-default': at('en') },
    },
    openGraph: { ...metadata.openGraph, url: at(locale) },
  }
}

export default async function GalleryItem(props: Props) {
  const page = await itemOf(props)
  if (page === null) notFound()
  const { locale, parsed, work } = page
  // One address: the slug the work carries now, whatever the visitor asked with.
  if (parsed.slug !== work.slug) permanentRedirect(itemHref(work, locale))
  // The Ask panel's handoff (5.3): a WhatsApp link whose message names the work, an email link
  // beside it, and — until the gallery's channels arrive (OA2) — the Contact page instead.
  const [site, settings] = await Promise.all([currentSite('gallery'), loadSiteSettings('gallery', locale)])
  const url = site.origin === null ? null : `${site.origin}${itemHref(work, locale)}`
  const message =
    work.status === 'sold'
      ? soldMessage(contactText(locale), {
          stockNumber: work.stockNumber ?? '',
          title: work.title,
          url: url ?? itemHref(work, locale),
        })
      : itemMessage(contactText(locale), {
          stockNumber: work.stockNumber ?? '',
          title: work.title,
          url: url ?? itemHref(work, locale),
        })
  const links = talkLinks(settings.contact, message)
  return (
    <ItemViewComposition
      work={work}
      locale={locale}
      askHref={links.wa ?? href('contact', {}, locale)}
      emailHref={links.mail}
      contactMissing={links.wa === null && links.mail === null}
      browseHref={href('browse', {}, locale)}
    />
  )
}
