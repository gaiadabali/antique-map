/**
 * The facets' option lists (14.4): a link per option, a long list showing its first eight with a
 * native "All n" disclosure that reveals the rest in place — every option stays a real link in
 * the HTML, and the disclosure opens by itself when the current selection sits in the hidden part.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { FacetVM, PlaceFacetVM } from '../../../server/gallery/catalogue/view-models'
import type { FacetState } from '../../../server/gallery/catalogue/state'
import styles from './facets.module.css'
import { objectTypeLabel } from './labels'

/** How many options a long list shows before its disclosure. */
export const VISIBLE_OPTIONS = 8

export type Link = (next: FacetState) => string
export type ListKey = 'objectType' | 'maker' | 'subject'

/** One option: a link, its name, its count — `aria-current` marks the applied ones. */
export function Option({
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

/** The rest of a long list, in place: a square, quiet summary; open when it holds a selection. */
function More({
  label,
  open,
  children,
}: {
  readonly label: string
  readonly open: boolean
  readonly children: React.ReactNode
}): React.ReactElement {
  return (
    <details className={styles.more} open={open || undefined}>
      <summary className={styles.moreSummary}>{label}</summary>
      {children}
    </details>
  )
}

/** A list facet: object types (the fixed list, zeros included), makers and subjects. */
export function Options({
  facet,
  name,
  state,
  link,
  locale,
  allLabel,
}: {
  readonly facet: FacetVM
  readonly name: ListKey
  readonly state: FacetState
  readonly link: Link
  readonly locale: SiteLocale
  /** The disclosure's words: “All 128 makers”. */
  readonly allLabel: string
}): React.ReactElement {
  const item = (option: FacetVM['options'][number]): React.ReactElement => (
    <li key={option.value}>
      <Option
        href={link(toggled(state, name, option.value))}
        applied={option.applied}
        label={name === 'objectType' ? objectTypeLabel(option.value, locale) : option.label}
        count={option.count}
      />
    </li>
  )
  const shown = facet.options.slice(0, VISIBLE_OPTIONS)
  const rest = facet.options.slice(VISIBLE_OPTIONS)
  return (
    <>
      <ul className={styles.facetList}>{shown.map(item)}</ul>
      {rest.length > 0 && (
        <More label={allLabel} open={rest.some((option) => option.applied)}>
          <ul className={styles.facetList}>{rest.map(item)}</ul>
        </More>
      )}
    </>
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

type Flat = { readonly place: PlaceFacetVM; readonly depth: number }

function flatten(places: readonly PlaceFacetVM[], depth = 0): readonly Flat[] {
  return places.flatMap((place) => [{ place, depth }, ...flatten(place.children, depth + 1)])
}

/** The place tree: island group → region → town, each count rolled up, in tree order. The first
 * eight places show; the rest open in place, indented by their depth. The applied place's link
 * clears it; any other narrows (or widens) to that place. */
export function PlaceTree({
  places,
  state,
  link,
  allLabel,
}: {
  readonly places: readonly PlaceFacetVM[]
  readonly state: FacetState
  readonly link: Link
  readonly allLabel: string
}): React.ReactElement {
  const row = ({ place, depth }: Flat): React.ReactElement => {
    const id = Number(place.value)
    return (
      <li key={place.value} className={styles.placeRow} data-depth={depth}>
        <Option
          href={link({ ...state, place: state.place === id ? null : id })}
          applied={state.place === id}
          label={place.label}
          count={place.count}
        />
      </li>
    )
  }
  const all = flatten(places)
  const shown = all.slice(0, VISIBLE_OPTIONS)
  const rest = all.slice(VISIBLE_OPTIONS)
  return (
    <>
      <ul className={styles.facetList}>{shown.map(row)}</ul>
      {rest.length > 0 && (
        <More
          label={allLabel}
          open={rest.some(({ place }) => place.applied || state.place === Number(place.value))}
        >
          <ul className={styles.facetList}>{rest.map(row)}</ul>
        </More>
      )}
    </>
  )
}
