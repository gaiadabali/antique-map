/**
 * The browse listing (5.1.b; EXPERIENCE-GALLERY.md §4, §9, §10): the title, the facets (the
 * desktop's left column, the phone's bottom sheet), the sorts, the applied chips, the cards and
 * the pages. Every control is a link to a canonical state (`./state-links`).
 */
import type { SiteLocale } from '@engine/config/sites'

import type { PlaceNode } from '../../../server/gallery/catalogue/places'
import type { FacetState } from '../../../server/gallery/catalogue/state'
import { WORK_SORTS } from '../../../server/gallery/catalogue/state'
import { clearedState } from '../../../server/gallery/catalogue/url-state'
import type { FacetSetVM, WorkListingVM } from '../../../server/gallery/catalogue/view-models'
import { Pagination } from '../../../shared/ui'
import { AppliedFilters } from './applied-filters'
import styles from './browse.module.css'
import { browseText } from './copy'
import { FacetSheet } from './facet-sheet'
import { FacetsPanel } from './facets-panel'
import { browseHref } from './state-links'
import { WorkGrid } from './work-grid'

export type ListingViewProps = {
  readonly listing: WorkListingVM
  readonly facets: FacetSetVM
  readonly state: FacetState
  readonly places: readonly PlaceNode[]
  readonly locale: SiteLocale
}

export function ListingView({
  listing,
  facets,
  state,
  places,
  locale,
}: ListingViewProps): React.ReactElement {
  const t = browseText(locale)
  const link = (next: FacetState): string => browseHref(next, places, locale)
  const panel = { state, facets, places, locale }
  return (
    // A plain block, not a labelled section: the facet column stays a top-level landmark.
    <div className={styles.page}>
      <h1 className={styles.title}>{t('browse.title')}</h1>

      <div className={styles.toolbar}>
        <div className={styles.phoneFacets}>
          <FacetSheet
            label={t('listing.filters')}
            apply={t('listing.showResults', { count: listing.total })}
            clearHref={link(clearedState(state))}
            clearLabel={t('listing.clearAll')}
          >
            <FacetsPanel {...panel} idPrefix="sheet" />
          </FacetSheet>
        </div>
        <nav className={styles.sortRow} aria-label={t('listing.sortBy')}>
          <span className={styles.sortLabel} aria-hidden="true">
            {t('listing.sortBy')}
          </span>
          <ul className={styles.sorts}>
            {WORK_SORTS.map((sort) => (
              <li key={sort}>
                <a
                  href={link({ ...state, sort, page: 1 })}
                  aria-current={state.sort === sort ? 'true' : undefined}
                  className={styles.sortLink}
                >
                  {t(`sort.${sort}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className={styles.columns}>
        <aside className={styles.desktopFacets} aria-label={t('listing.filters')}>
          <FacetsPanel {...panel} idPrefix="column" />
        </aside>

        <div className={styles.results}>
          <AppliedFilters {...panel} />
          <p className={styles.count} aria-live="polite">
            {t('message.works', { count: listing.total })}
          </p>
          {listing.items.length === 0 ? (
            <p className={styles.empty}>{t('empty.filters')}</p>
          ) : (
            <WorkGrid works={listing.items} locale={locale} />
          )}
          {listing.pages > 1 && (
            <Pagination
              currentPage={listing.page}
              totalPages={listing.pages}
              getHref={(page) => link({ ...state, page })}
              ariaLabel={t('listing.pagination', { page: listing.page, pages: listing.pages })}
              previousLabel={t('listing.previous')}
              nextLabel={t('listing.next')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
