/**
 * The gallery item page (5.2.b): one address per work — `/product/{publicId}-{slug}`. A request
 * that reaches the item route with no slug or a stale slug answers **308** to the canonical one
 * (`permanentRedirect`, the one-address rule); an id that names no published work is `notFound()`.
 * The page is a thin composition: the read is `loadItem()` (published-only, projected,
 * price-free), the sections live in `sites/gallery/item/*`, and `generateMetadata` calls the
 * 9.3 SEO library only.
 */
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'

import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import { loadItem } from '../../../../../../server/gallery/item/load-item'
import { pageMetadata } from '../../../../../../server/seo'
import { siteLocale } from '../../../../../../shell/messages'
import { currentSite } from '../../../../../../shell/site'
import { itemText } from '../../../../../../sites/gallery/item/copy'
import { ItemViewComposition } from '../../../../../../sites/gallery/item/item-view'

type Props = PageProps<'/gallery/[locale]/product/[id]'>

const href = createHref(SITES.gallery)

/** The address's id–slug shape: the id resolves the work, the slug is words for people. */
function parseId(raw: string): { publicId: string; slug: string } | null {
  const match = /^([1-9]\d{0,8})(?:-([a-z0-9-]*))?$/.exec(raw)
  if (match === null) return null
  return { publicId: match[1]!, slug: match[2] ?? '' }
}

async function itemOf(props: Props) {
  const { locale: raw, id } = await props.params
  const locale = siteLocale('gallery', raw)
  const parsed = parseId(id)
  if (locale === null || parsed === null) return null
  const t = itemText(locale)
  const work = await loadItem(parsed.publicId, locale, t('item.dateUnknown'))
  if (work === null) return null
  return { locale, parsed, work }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [page, site] = await Promise.all([itemOf(props), currentSite('gallery')])
  if (page === null || site.origin === null) return {}
  const { locale, work } = page
  const byline = [work.maker?.name, work.date].filter(Boolean).join(', ')
  return pageMetadata({
    site: 'gallery',
    locale,
    path: href('item', { publicId: work.publicId, slug: work.slug }, locale),
    title: byline !== '' ? `${work.title} – ${byline}` : work.title,
    description: work.originalTitle ?? work.title,
    image:
      work.images[0] !== undefined
        ? {
            url: work.images[0].url,
            alt: work.images[0].alt,
            ...(work.images[0].width !== null ? { width: work.images[0].width } : {}),
            ...(work.images[0].height !== null ? { height: work.images[0].height } : {}),
          }
        : undefined,
    origin: site.origin,
  })
}

export default async function GalleryItem(props: Props) {
  const page = await itemOf(props)
  if (page === null) notFound()
  const { locale, parsed, work } = page
  // One address: the slug the work carries now, whatever the visitor asked with.
  if (parsed.slug !== work.slug) {
    permanentRedirect(href('item', { publicId: work.publicId, slug: work.slug }, locale))
  }
  return (
    <ItemViewComposition
      work={work}
      locale={locale as SiteLocale}
      // TODO(5.3): the WhatsApp builder replaces the plain contact page.
      askHref={locale === 'id' ? '/id/kontak' : '/contact'}
      browseHref={href('browse', {}, locale)}
    />
  )
}
