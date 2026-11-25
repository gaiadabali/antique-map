/**
 * The two optional stores columns that place a store on the Stores page (TASKS.md 28.1):
 * `region` and `flagship`. A sheet without the columns never reaches here with a value — the key
 * stays out of the data, so an existing store keeps what the owner set in the admin. A sheet
 * that carries the column is the owner's word: an empty `region` cell clears it (the store is
 * listed under Other).
 */
import { yesNo } from '@engine/cms-core/import/cells'
import { optionProblem, pickOption, type Row } from '@engine/cms-core/import/plan'
import type { Problem } from '@engine/cms-core/import/types'

/** `other` is the empty choice, so it is not a value a sheet writes. */
export const SHEET_REGIONS = ['lombok', 'ubud', 'amed', 'canggu'] as const

/** The grouping fields to add to a store's data, or the problem that refuses the row. */
export function storeGrouping(row: Row): { data: Record<string, unknown> } | { problem: Problem } {
  const data: Record<string, unknown> = {}
  const region = row.cells.region
  if (region !== undefined) {
    if (region.trim() === '') {
      data.region = null
    } else {
      const hit = pickOption(SHEET_REGIONS, region, 'region')
      if (hit === null) return { problem: optionProblem('region', region, SHEET_REGIONS) }
      data.region = hit
    }
  }
  const flag = yesNo(row.cells.flagship, 'flagship')
  if (flag.error) return { problem: { column: 'flagship', problem: flag.error } }
  if (flag.value !== undefined) data.flagship = flag.value
  return { data }
}
