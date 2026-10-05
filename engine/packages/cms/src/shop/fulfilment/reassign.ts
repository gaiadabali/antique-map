import type { Payload } from 'payload'

import type { ReassignInput, ReassignResult } from './types'

/**
 * Reassigns a `paid` or `processing` order to another store (COMMERCE.md §4), owner or editor
 * only: in one transaction the units go back to the first store and are taken at the second by
 * the atomic decrement; refused, with both stocks unchanged, when the second cannot fill every line.
 */
export async function reassignOrder(
  payload: Payload,
  input: ReassignInput,
): Promise<ReassignResult> {
  void payload
  void input
  throw new Error('fulfilment: reassignOrder is not built yet (7.1 step 2)')
}
