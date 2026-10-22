/**
 * Browse (5.1.b): the gallery's listing over the published works. The proxy rewrites every
 * browse address — `/browse`, `/antique-maps/java`, `/id/jelajah?maker=12` — to this route with
 * the listing's canonical query alone (`parsePublicPath()`), the type and place path segments
 * folded into it, so the page reads `parseListingQuery()` and never a public path; it never sees
 * segments of its own (any would be no address). A place path that names no published place is
 * no address either: 404.
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { parseListingQuery, SITES, type SiteLocale } from '@engine/config/sites'

import { facets, listing, placeTree } from '../../../../../../server/gallery/catalogue'
import { stateOfListing } from '../../../../../../server/gallery/catalogue/url-state'
import { pageMetadata } from '../../../../../../server/seo'
import { siteLocale } from '../../../../../../shell/messages'
import { currentSite } from '../../../../../../shell/site'
import { BrowseBeacon } from '../../../../../../sites/gallery/browse/browse-beacon'
import { browseText } from '../../../../../../sites/gallery/browse/copy'
import { listingTypeOf } from '../../../../../../sites/gallery/browse/facets-panel'
import { ListingView } from '../../../../../../sites/gallery/browse/listing-view'
import { beaconFacetsOf, browseHref } from '../../../../../../sites/gallery/browse/state-links'

type Props = PageProps<'/gallery/[locale]/browse/[[...facets]]'>

/** The page's locale and facet state, or `null` — the address names nothing. */
async function stateOf({ params, searchParams }: Props) {
  const { locale: raw, facets: segments } = await params
  const locale = siteLocale('gallery', raw)
  if (locale === null || (segments?.length ?? 0) > 0) return null
  const places = await placeTree(locale)
  const query = parseListingQuery(SITES.gallery.routes, 'browse', await searchParams)
  const state = stateOfListing(query, places)
  return state === null ? null : { locale, places, state }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [page, site] = await Promise.all([stateOf(props), currentSite('gallery')])
  if (page === null || site.origin === null) return {}
  const text = browseText(page.locale)
  const at = (l: SiteLocale) => browseHref({ ...page.state, page: 1 }, page.places, l)
  return pageMetadata({
    site: 'gallery',
    locale: page.locale,
    // The canonical is the state's own address: the first page of the same filters.
    paths: { en: at('en'), id: at('id') },
    title: text('browse.title'),
    description: text('browse.description'),
    origin: site.origin,
  })
}

export default async function GalleryBrowse(props: Props) {
  const page = await stateOf(props)
  if (page === null) notFound()
  const { locale, places, state } = page
  const [works, facetSet] = await Promise.all([listing(state, locale), facets(state, locale)])
  return (
    <>
      <BrowseBeacon
        listing={listingTypeOf(state)}
        facets={beaconFacetsOf(state)}
        resultCount={works.total}
      />
      <ListingView
        listing={works}
        facets={facetSet}
        state={state}
        places={places}
        locale={locale}
      />
    </>
  )
}
