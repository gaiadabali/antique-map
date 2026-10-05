import type { Payload } from 'payload'

import type { MoveInput, MoveResult } from './types'

/**
 * Moves an order to `to` (COMMERCE.md §7): store staff one step forward on their own store's
 * order, the owner and editors any legal move. One transaction with the order row locked; a
 * history row (who, when, from, to, reason) for every change; a cancel from a holding status
 * returns the order's stock to its store once.
 */
export async function moveOrder(payload: Payload, input: MoveInput): Promise<MoveResult> {
  void payload
  void input
  throw new Error('fulfilment: moveOrder is not built yet (7.1 step 2)')
}
