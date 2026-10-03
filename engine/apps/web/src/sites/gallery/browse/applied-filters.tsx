/**
 * The filters a URL carries, said above the grid (5.1.b; EXPERIENCE-GALLERY.md §9): one chip per
 * applied filter, each a real link that clears it, and a Clear all. A zero-match filter is never
 * hidden — its chip is how the visitor undoes it.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { FacetSetVM, FacetVM } from '../../../server/gallery/catalogue/view-models'
import type { PlaceNode } from '../../../server/gallery/catalogue/places'
import type { FacetState } from '../../../server/gallery/catalogue/state'
import { clearedState } from '../../../server/gallery/catalogue/url-state'
import { browseText } from './copy'
import styles from './facets.module.css'
import { centuryLabel, objectTypeLabel, placeLabel, yearPairLabel } from './labels'
import { browseHref } from './state-links'

export type AppliedFiltersProps = {
  readonly state: FacetState
  readonly facets: FacetSetVM
  readonly places: readonly PlaceNode[]
  readonly locale: SiteLocale
}

export type AppliedChip = {
  readonly key: string
  readonly label: string
  /** The address with this one filter cleared. */
  readonly clearHref: string
}

export function AppliedFilters(props: AppliedFiltersProps): React.ReactElement | null {
  const { state, places, locale } = props
  const t = browseText(locale)
  const chips = chipsOf(props)
  if (chips.length === 0) return null
  return (
    <div className={styles.applied}>
      <ul className={styles.appliedList}>
        {chips.map((chip) => (
          <li key={chip.key}>
            <a
              href={chip.clearHref}
              className={styles.appliedChip}
              aria-label={t('listing.removeFilter', { label: chip.label })}
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </a>
          </li>
        ))}
      </ul>
      <a href={browseHref(clearedState(state), places, locale)} className={styles.clearAll}>
        {t('listing.clearAll')}
      </a>
    </div>
  )
}

/** One chip per applied filter, with the address that undoes it. */
export function chipsOf({
  state,
  facets,
  places,
  locale,
}: AppliedFiltersProps): readonly AppliedChip[] {
  const t = browseText(locale)
  const without = (next: FacetState): string => browseHref({ ...next, page: 1 }, places, locale)
  const optionLabel = (key: FacetVM['key'], value: number): string =>
    facets.find((facet) => facet.key === key)?.options.find((o) => o.value === String(value))
      ?.label || String(value)

  const chips: AppliedChip[] = []
  for (const value of state.objectType) {
    chips.push({
      key: `objectType-${value}`,
      label: objectTypeLabel(value, locale),
      clearHref: without({ ...state, objectType: state.objectType.filter((v) => v !== value) }),
    })
  }
  if (state.place !== null) {
    chips.push({
      key: `place-${state.place}`,
      label: placeLabel(places, state.place),
      clearHref: without({ ...state, place: null }),
    })
  }
  for (const value of state.maker) {
    chips.push({
      key: `maker-${value}`,
      label: optionLabel('maker', value),
      clearHref: without({ ...state, maker: state.maker.filter((v) => v !== value) }),
    })
  }
  if (state.century !== null) {
    chips.push({
      key: 'date-century',
      label: centuryLabel(state.century, locale),
      clearHref: without({ ...state, century: null }),
    })
  }
  if (state.yearFrom !== null || state.yearTo !== null) {
    chips.push({
      key: 'date-years',
      label: yearPairLabel(state.yearFrom, state.yearTo),
      clearHref: without({ ...state, yearFrom: null, yearTo: null }),
    })
  }
  for (const value of state.subject) {
    chips.push({
      key: `subject-${value}`,
      label: optionLabel('subject', value),
      clearHref: without({ ...state, subject: state.subject.filter((v) => v !== value) }),
    })
  }
  if (state.includeSold) {
    chips.push({
      key: 'availability-sold',
      label: t('browse.includeSold'),
      clearHref: without({ ...state, includeSold: false }),
    })
  }
  return chips
}
