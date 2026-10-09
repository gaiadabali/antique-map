/**
 * The six facets as links (5.1.b; EXPERIENCE-GALLERY.md §4, §9): every option is a real link,
 * so browsing works without JavaScript, and an applied option's link removes it again. Each count
 * is the loader's all-but-own one, and a zero is still shown — it is part of the catalogue. The
 * place is a tree with rolled-up counts; the period is century chips plus a from–to year pair.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { FacetSetVM } from '../../../server/gallery/catalogue/view-models'
import type { PlaceNode } from '../../../server/gallery/catalogue/places'
import type { FacetState } from '../../../server/gallery/catalogue/state'
import { listingOfState } from '../../../server/gallery/catalogue/url-state'
import { browseText } from './copy'
import { Option, Options, PlaceTree, type Link } from './facet-list'
import styles from './facets.module.css'
import { centuryLabel } from './labels'
import { browseBase, browseHref, hiddenInputsOf } from './state-links'
import { YearPair } from './year-pair'

export type FacetsPanelProps = {
  readonly state: FacetState
  readonly facets: FacetSetVM
  readonly places: readonly PlaceNode[]
  readonly locale: SiteLocale
  /** Where the panel renders (`sheet`, `column`): keeps its ids and landmark names apart. */
  readonly idPrefix: string
}

const ALL_KEYS = {
  objectType: 'listing.allTypes',
  maker: 'listing.allMakers',
  subject: 'listing.allSubjects',
} as const

/** The facet a state filters by, as the beacon's `listing` prop names it. */
export function listingTypeOf(state: FacetState): 'type' | 'maker' | 'place' | 'subject' | 'all' {
  if (state.objectType.length > 0) return 'type'
  if (state.maker.length > 0) return 'maker'
  if (state.place !== null) return 'place'
  if (state.subject.length > 0) return 'subject'
  return 'all'
}

export function FacetsPanel({
  state,
  facets,
  places,
  locale,
  idPrefix,
}: FacetsPanelProps): React.ReactElement {
  const t = browseText(locale)
  const link: Link = (next) => browseHref({ ...next, page: 1 }, places, locale)
  return (
    <div className={styles.facets}>
      {facets.filter(hasOptions).map((facet) => (
        <section
          key={facet.key}
          className={styles.facet}
          aria-labelledby={`${idPrefix}-${facet.key}`}
        >
          <h2 id={`${idPrefix}-${facet.key}`} className={styles.facetName}>
            {t(`facet.${facet.key}`)}
          </h2>
          {facet.key === 'availability' && (
            <Option
              href={link({ ...state, includeSold: !state.includeSold })}
              applied={state.includeSold}
              label={t('browse.includeSold')}
              count={facet.options.find((option) => option.value === 'sold')?.count ?? 0}
            />
          )}
          {(facet.key === 'objectType' || facet.key === 'maker' || facet.key === 'subject') && (
            <Options
              facet={facet}
              name={facet.key}
              state={state}
              link={link}
              locale={locale}
              allLabel={t(ALL_KEYS[facet.key], { count: facet.options.length })}
            />
          )}
          {facet.key === 'place' && (
            <PlaceTree
              places={facet.places}
              state={state}
              link={link}
              allLabel={t('listing.allPlaces')}
            />
          )}
          {facet.key === 'date' && (
            <>
              <ul className={styles.facetList}>
                {facet.options.map((option) => (
                  <li key={option.value}>
                    <Option
                      href={link({
                        ...state,
                        century: option.applied ? null : Number(option.value),
                      })}
                      applied={option.applied}
                      label={centuryLabel(Number(option.value), locale)}
                      count={option.count}
                    />
                  </li>
                ))}
              </ul>
              <YearPair
                idPrefix={idPrefix}
                action={browseBase(locale)}
                hidden={[
                  ...hiddenInputsOf(state, places),
                  ...(state.century !== null ? [['date', String(state.century)] as const] : []),
                ]}
                listing={listingOfState({ ...state, yearFrom: null, yearTo: null }, places)}
                locale={locale}
                from={state.yearFrom}
                to={state.yearTo}
                labels={{
                  from: t('listing.periodFrom'),
                  to: t('listing.periodTo'),
                  apply: t('listing.apply'),
                }}
              />
            </>
          )}
        </section>
      ))}
    </div>
  )
}

/** A facet with nothing to offer (no places, no subjects on this selection) shows no heading. */
function hasOptions(facet: FacetSetVM[number]): boolean {
  if (facet.key === 'place') return facet.places.length > 0
  if (facet.key === 'maker' || facet.key === 'subject') return facet.options.length > 0
  return true
}
