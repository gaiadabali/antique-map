/**
 * Search (5.1.b/c; EXPERIENCE-GALLERY.md §4, §10): the proxy hands the page the canonical query —
 * the words in `q`, `availability=sold` when the visitor includes the sold archive. The form is a
 * plain GET form; the results stream inside `<Suspense>` so the shell and the form answer first.
 * A stock number (`M.0500`) is a jump, not a search: the page redirects to that item. A search
 * page is never indexed.
 */
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { parseListingQuery, SITES, type SiteLocale } from '@engine/config/sites'

import { search } from '../../../../../server/gallery/catalogue'
import { isStockNumber } from '../../../../../server/gallery/catalogue/search'
import { pageMetadata } from '../../../../../server/seo'
import { loadSiteSettings } from '../../../../../server/site-settings'
import { SectionHead } from '../../../../../shared/ui'
import { siteLocale } from '../../../../../shell/messages'
import { currentSite } from '../../../../../shell/site'
import browse from '../../../../../sites/gallery/browse/browse.module.css'
import { browseText } from '../../../../../sites/gallery/browse/copy'
import { itemHref, searchHref } from '../../../../../sites/gallery/browse/state-links'
import { SearchBeacon } from '../../../../../sites/gallery/search/search-beacon'
import { SearchForm } from '../../../../../sites/gallery/search/search-form'
import styles from '../../../../../sites/gallery/search/search.module.css'
import { SearchView } from '../../../../../sites/gallery/search/search-view'

type Props = PageProps<'/gallery/[locale]/search'>

const MAX_QUERY = 200

async function queryOf(props: Props) {
  const locale = siteLocale('gallery', (await props.params).locale)
  if (locale === null) return null
  const listing = parseListingQuery(SITES.gallery.routes, 'search', await props.searchParams)
  return {
    locale,
    query: (listing.q ?? '').slice(0, MAX_QUERY),
    includeSold: [listing.facets?.availability ?? []].flat().includes('sold'),
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [page, site] = await Promise.all([queryOf(props), currentSite('gallery')])
  if (page === null || site.origin === null) return {}
  const text = browseText(page.locale)
  return pageMetadata({
    site: 'gallery',
    locale: page.locale,
    paths: {
      en: searchHref(page.query, page.includeSold, 'en'),
      id: searchHref(page.query, page.includeSold, 'id'),
    },
    title:
      page.query === '' ? text('search.title') : text('search.resultsFor', { query: page.query }),
    description: text('browse.description'),
    origin: site.origin,
    noindex: true,
  })
}

export default async function GallerySearch(props: Props) {
  const page = await queryOf(props)
  if (page === null) notFound() // the segment's not-found answers an unknown locale
  const { locale, query, includeSold } = page
  const text = browseText(locale)

  // A stock number names one item: go there. Anything else — a number no work carries
  // included — is searched like any words.
  if (isStockNumber(query)) {
    const answer = await search({ query, locale, includeSold: true })
    if (answer.jumpTo !== null) redirect(itemHref(answer.jumpTo.publicId, locale))
  }

  return (
    <div className={browse.page}>
      <SectionHead level={1} className={browse.head} title={text('search.title')} />
      <SearchForm query={query} includeSold={includeSold} locale={locale} />
      {query === '' ? (
        <p className={styles.prompt}>{text('search.prompt')}</p>
      ) : (
        <Suspense fallback={null}>
          <Results query={query} includeSold={includeSold} locale={locale} />
        </Suspense>
      )}
    </div>
  )
}

async function Results({
  query,
  includeSold,
  locale,
}: {
  readonly query: string
  readonly includeSold: boolean
  readonly locale: SiteLocale
}): Promise<React.ReactElement> {
  const [result, settings] = await Promise.all([
    search({ query, locale, includeSold }),
    loadSiteSettings('gallery', locale),
  ])
  return (
    <>
      <SearchBeacon query={query} resultCount={result.total} />
      <SearchView
        query={query}
        includeSold={includeSold}
        result={result}
        locale={locale}
        contact={{ whatsapp: settings.contact.whatsapp, email: settings.contact.email }}
      />
    </>
  )
}
