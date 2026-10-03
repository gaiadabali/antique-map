/**
 * The gallery's listing read (5.1.a): the work ids one facet state selects — sorted, filtered,
 * paged — projected to cards (`./projection`). Published-only is in the SQL itself (`./db`); the
 * projection is a Payload read with `overrideAccess: false` and an explicit `select`. **No price
 * and no staff field is ever read**: the gallery sells by enquiry.
 */
import type { Payload } from 'payload'

import type { SiteLocale } from '@engine/config/sites'

import { filterParts, orderOf, poolOf, whereOf, type FilterContext } from './db'
import { projectCards } from './projection'
import type { FacetState } from './state'
import type { WorkListingVM } from './view-models'

export const LIST_PAGE_SIZE = 24

/** One page of the browse listing. */
export async function listWorks(
  payload: Payload,
  state: FacetState,
  ctx: FilterContext,
  locale: SiteLocale,
  unknownDateText: string,
): Promise<WorkListingVM> {
  const parts = filterParts(state, ctx)
  const offset = (state.page - 1) * LIST_PAGE_SIZE
  const pool = poolOf(payload)
  const { rows } = await pool.query(
    `SELECT w.id, COUNT(*) OVER () AS total
       FROM works w
       ${whereOf(parts)}
       ${orderOf(state)}
       LIMIT $${parts.values.length + 1} OFFSET $${parts.values.length + 2}`,
    [...parts.values, LIST_PAGE_SIZE, offset],
  )
  const total = rows.length > 0 ? Number(rows[0]?.total ?? 0) : 0
  const items = await projectCards(
    payload,
    rows.map((row) => Number(row.id)),
    locale,
    unknownDateText,
  )
  return {
    items,
    page: state.page,
    pages: Math.max(1, Math.ceil(total / LIST_PAGE_SIZE)),
    total,
    sort: state.sort,
  }
}
