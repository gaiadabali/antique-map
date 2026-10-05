/**
 * The six facets as links (5.1.b; EXPERIENCE-GALLERY.md §4, §9): every option is a real link,
 * so browsing works without JavaScript, and an applied option's link removes it again. Each count
 * is the loader's all-but-own one, and a zero is still shown — it is part of the catalogue. The
 * place is a tree with rolled-up counts; the period is century chips plus a from–to year pair.
 */
import type { SiteLocale } from '@engine/config/sites'

import type {
  FacetSetVM,
  FacetVM,
  PlaceFacetVM,
} from '../../../server/gallery/catalogue/view-models'
import type { PlaceNode } from '../../../server/gallery/catalogue/places'
import type { FacetState } from '../../../server/gallery/catalogue/state'
import { listingOfState } from '../../../server/gallery/catalogue/url-state'
import { browseText } from './copy'
import styles from './facets.module.css'
import { centuryLabel, objectTypeLabel } from './labels'
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

type Link = (next: FacetState) => string
type ListKey = 'objectType' | 'maker' | 'subject'

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
      {facets.map((facet) => (
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
            <Options facet={facet} name={facet.key} state={state} link={link} locale={locale} />
          )}
          {facet.key === 'place' && <PlaceTree places={facet.places} state={state} link={link} />}
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

/** One option: a link, its name, its count — `aria-current` marks the applied ones. */
function Option({
  href,
  applied,
  label,
  count,
}: {
  readonly href: string
  readonly applied: boolean
  readonly label: string
  readonly count: number
}): React.ReactElement {
  return (
    <a href={href} aria-current={applied ? 'true' : undefined} className={styles.option}>
      <span className={styles.optionLabel}>{label}</span>
      <span className={styles.optionCount}>{count}</span>
    </a>
  )
}

/** A list facet: object types (the fixed list, zeros included), makers and subjects. */
function Options({
  facet,
  name,
  state,
  link,
  locale,
}: {
  readonly facet: FacetVM
  readonly name: ListKey
  readonly state: FacetState
  readonly link: Link
  readonly locale: SiteLocale
}): React.ReactElement {
  return (
    <ul className={styles.facetList}>
      {facet.options.map((option) => (
        <li key={option.value}>
          <Option
            href={link(toggled(state, name, option.value))}
            applied={option.applied}
            label={name === 'objectType' ? objectTypeLabel(option.value, locale) : option.label}
            count={option.count}
          />
        </li>
      ))}
    </ul>
  )
}

/** The state with one list option added, or removed when it was applied. */
function toggled(state: FacetState, name: ListKey, value: string): FacetState {
  if (name === 'objectType') {
    const on = state.objectType.includes(value)
    return {
      ...state,
      objectType: on ? state.objectType.filter((v) => v !== value) : [...state.objectType, value],
    }
  }
  const id = Number(value)
  const on = state[name].includes(id)
  return { ...state, [name]: on ? state[name].filter((v) => v !== id) : [...state[name], id] }
}

/** The place tree: island group → region → town, each count rolled up. The applied place's link
 * clears it; any other narrows (or widens) to that place. */
function PlaceTree({
  places,
  state,
  link,
}: {
  readonly places: readonly PlaceFacetVM[]
  readonly state: FacetState
  readonly link: Link
}): React.ReactElement {
  const branch = (place: PlaceFacetVM): React.ReactElement => {
    const id = Number(place.value)
    return (
      <li key={place.value}>
        <Option
          href={link({ ...state, place: state.place === id ? null : id })}
          applied={state.place === id}
          label={place.label}
          count={place.count}
        />
        {place.children.length > 0 && (
          <ul className={`${styles.facetList} ${styles.placeChildren}`}>
            {place.children.map(branch)}
          </ul>
        )}
      </li>
    )
  }
  return <ul className={styles.facetList}>{places.map(branch)}</ul>
}
