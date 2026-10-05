import type { Payload } from 'payload'

import type { HandBackInput, HandBackResult } from './types'

/** A store user hands their store's order back with a reason; it is flagged for the owner. */
export async function handBackOrder(
  payload: Payload,
  input: HandBackInput,
): Promise<HandBackResult> {
  void payload
  void input
  throw new Error('fulfilment: handBackOrder is not built yet (7.1 step 2)')
}
