/**
 * The six facets the browse page filters by (5.1.a; EXPERIENCE-GALLERY.md §4): availability,
 * type, maker, place, period and subject. Each facet's counts apply **every filter but its own**
 * — otherwise every unselected option would read zero once a filter is on — and the place's
 * counts roll up to the island group. A facet with no matches yet still shows: the zero is part
 * of the catalogue (EXPERIENCE-GALLERY.md §9).
 *
 * The fixed lists — the object types, the centuries — are always shown, zeros included; the
 * data-driven lists — makers, places, subjects — show what the catalogue holds. Availability and
 * the object types are named by the lexicon (`facet.*`, `objectType.*`): the loader answers
 * values and counts, the page words them.
 */
import type { Payload } from 'payload'

import type { SiteLocale } from '@engine/config/sites'
import { OBJECT_TYPES } from '@engine/config/schema'

import { filterParts, poolOf, whereOf, type FilterContext } from './db'
import { SQL_EARLIEST_YEAR } from './date-reading'
import { loadPlaces, rolledUpCounts, type PlaceNode } from './places'
import { PERIOD_CHIPS, type FacetState } from './state'
import type { FacetOptionVM, FacetSetVM, FacetVM, PlaceFacetVM } from './view-models'

const WORK_STATUSES = ['available', 'on-hold', 'sold'] as const

type Counts = ReadonlyMap<string, number>

async function countsOf(
  payload: Payload,
  sql: string,
  values: readonly unknown[],
): Promise<Counts> {
  const pool = poolOf(payload)
  const { rows } = await pool.query(sql, [...values])
  return new Map(rows.map((row) => [String(row.value), Number(row.count)]))
}

/** Every facet, computed in one pass over the state. */
export async function facetsOf(
  payload: Payload,
  state: FacetState,
  ctx: FilterContext,
  locale: SiteLocale,
): Promise<FacetSetVM> {
  // One after another, not all at once: a cold page runs these beside the listing, and the
  // pool's handful of connections is shared with every other request (a connect waits 5 s).
  const availability = await availabilityCounts(payload, state, ctx)
  const types = await typeCounts(payload, state, ctx)
  const makers = await makerCounts(payload, state, ctx)
  const subjects = await subjectCountsOf(payload, state, ctx)
  const placeFacet = await placeFacetOf(payload, state, ctx, locale)
  const periods = await periodCountsOf(payload, state, ctx)

  const makerOptions = await optionsForMakers(payload, makers, state)
  const subjectOptions = await optionsForSubjects(payload, subjects, state, locale)

  const facet = (
    key: FacetVM['key'],
    options: readonly FacetOptionVM[],
    places: readonly PlaceFacetVM[] = [],
    range: FacetVM['range'] = { from: null, to: null },
  ): FacetVM => ({ key, options, places, range })

  return [
    facet(
      'availability',
      WORK_STATUSES.map((status) => ({
        value: status,
        label: '',
        count: availability.get(status) ?? 0,
        applied: status === 'sold' ? state.includeSold : false,
      })),
    ),
    facet(
      'objectType',
      [...OBJECT_TYPES].map((type) => ({
        value: type,
        label: '',
        count: types.get(type) ?? 0,
        applied: state.objectType.includes(type),
      })),
    ),
    facet('maker', makerOptions),
    facet('place', [], placeFacet),
    facet(
      'date',
      [...PERIOD_CHIPS].map((century) => ({
        value: String(century),
        label: '',
        count: periods.get(String(century)) ?? 0,
        applied: state.century === century,
      })),
      [],
      { from: state.yearFrom, to: state.yearTo },
    ),
    facet('subject', subjectOptions),
  ]
}

/** Availability's counts: every other filter applied, none of this one's. */
async function availabilityCounts(
  payload: Payload,
  state: FacetState,
  ctx: FilterContext,
): Promise<Counts> {
  const parts = filterParts(state, ctx, 'availability')
  return countsOf(
    payload,
    `SELECT w.status AS value, COUNT(*)::int AS count FROM works w ${whereOf(parts)} GROUP BY 1`,
    parts.values,
  )
}

async function typeCounts(
  payload: Payload,
  state: FacetState,
  ctx: FilterContext,
): Promise<Counts> {
  const parts = filterParts(state, ctx, 'objectType')
  return countsOf(
    payload,
    `SELECT w.object_type AS value, COUNT(*)::int AS count FROM works w ${whereOf(parts)} GROUP BY 1`,
    parts.values,
  )
}

/** Makers count per credit; a work credited to two makers counts for each of them. */
async function makerCounts(
  payload: Payload,
  state: FacetState,
  ctx: FilterContext,
): Promise<Counts> {
  const parts = filterParts(state, ctx, 'maker')
  return countsOf(
    payload,
    `SELECT wm.maker_id AS value, COUNT(DISTINCT w.id)::int AS count
       FROM works w JOIN works_makers wm ON wm._parent_id = w.id
       ${whereOf(parts)} GROUP BY 1`,
    parts.values,
  )
}

async function subjectCountsOf(
  payload: Payload,
  state: FacetState,
  ctx: FilterContext,
): Promise<Counts> {
  const parts = filterParts(state, ctx, 'subject')
  return countsOf(
    payload,
    `SELECT wr.terms_id AS value, COUNT(DISTINCT w.id)::int AS count
       FROM works w JOIN works_rels wr ON wr.parent_id = w.id AND wr.path = 'subjects'
       ${whereOf(parts)} GROUP BY 1`,
    parts.values,
  )
}

/** One primary place per work, and the counts roll up to its ancestors (`./places`). */
async function placeFacetOf(
  payload: Payload,
  state: FacetState,
  ctx: FilterContext,
  locale: SiteLocale,
): Promise<readonly PlaceFacetVM[]> {
  const [counts, places] = await Promise.all([
    (async () => {
      const parts = filterParts(state, ctx, 'place')
      return countsOf(
        payload,
        `SELECT wp.place_id AS value, COUNT(*)::int AS count
           FROM works w JOIN works_places wp ON wp._parent_id = w.id AND wp."primary" = true
           ${whereOf(parts)} GROUP BY 1`,
        parts.values,
      )
    })(),
    loadPlaces(payload, locale),
  ])
  const numeric = new Map(
    [...counts.entries()].map(([key, count]) => [Number(key), count] as const),
  )
  return placeTreeOf(places, rolledUpCounts(places, numeric), ctx, state)
}

/** The period's counts: the earliest year a work allows names its century. */
async function periodCountsOf(
  payload: Payload,
  state: FacetState,
  ctx: FilterContext,
): Promise<Counts> {
  const parts = filterParts(state, ctx, 'date')
  return countsOf(
    payload,
    `SELECT (FLOOR(((${SQL_EARLIEST_YEAR})::numeric - 1) / 100)::int + 1)::text AS value,
            COUNT(*)::int AS count
       FROM works w ${whereOf(parts)}
       GROUP BY 1`,
    parts.values,
  )
}

/** Maker options: the catalogue's makers, named as the data spells them, counted by the
 * all-but-own rule. A maker no published work credits has no row in the facet. */
async function optionsForMakers(
  payload: Payload,
  counts: Counts,
  state: FacetState,
): Promise<readonly FacetOptionVM[]> {
  if (counts.size === 0) return []
  const found = await payload.find({
    collection: 'makers',
    overrideAccess: false,
    where: {
      and: [{ _status: { equals: 'published' } }, { id: { in: [...counts.keys()].map(Number) } }],
    },
    select: { name: true },
    depth: 0,
    limit: counts.size,
  })
  return (found.docs as readonly { id: number; name?: unknown }[])
    .map((doc) => ({
      value: String(doc.id),
      label: typeof doc.name === 'string' ? doc.name : '',
      count: counts.get(String(doc.id)) ?? 0,
      applied: state.maker.includes(doc.id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Subject options: the published terms of kind `subject` the catalogue's works carry. */
async function optionsForSubjects(
  payload: Payload,
  counts: Counts,
  state: FacetState,
  locale: SiteLocale,
): Promise<readonly FacetOptionVM[]> {
  if (counts.size === 0) return []
  const found = await payload.find({
    collection: 'terms',
    overrideAccess: false,
    where: {
      and: [
        { _status: { equals: 'published' } },
        { kind: { equals: 'subject' } },
        { id: { in: [...counts.keys()].map(Number) } },
      ],
    },
    select: { label: true },
    depth: 0,
    limit: counts.size,
    locale,
  })
  return (found.docs as readonly { id: number; label?: unknown }[])
    .filter((doc) => counts.has(String(doc.id)))
    .map((doc) => ({
      value: String(doc.id),
      label: typeof doc.label === 'string' ? doc.label : '',
      count: counts.get(String(doc.id)) ?? 0,
      applied: state.subject.includes(doc.id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** The place facet's tree: a branch per place the catalogue carries, the children a visitor can
 * narrow to beneath it, each level's count its rolled-up one. A place filter selects the place
 * and everything within it (`./places`). */
function placeTreeOf(
  places: readonly PlaceNode[],
  counts: ReadonlyMap<number, number>,
  ctx: FilterContext,
  state: FacetState,
): readonly PlaceFacetVM[] {
  const applied = state.place !== null ? [...ctx.placeIds(state.place)] : []
  const names = new Map(places.map((place) => [place.id, place.name]))

  const branch = (placeId: number): PlaceFacetVM | null => {
    const count = counts.get(placeId)
    if (count === undefined) return null
    const children = places
      .filter((place) => place.parentId === placeId)
      .flatMap((place) => branch(place.id) ?? [])
    const option: PlaceFacetVM = {
      value: String(placeId),
      label: names.get(placeId) ?? '',
      count,
      applied: applied.includes(placeId),
      children: children.sort((a, b) => a.label.localeCompare(b.label)),
    }
    return option
  }

  return places
    .filter((place) => place.parentId === null)
    .flatMap((place) => branch(place.id) ?? [])
    .sort((a, b) => a.label.localeCompare(b.label))
}
