/** A fake bag in a cookie — the item ids of its lines — so a line's removal can be posted. */
import { cookies } from 'next/headers'

import { SPIKE_ITEMS } from './items'

export const BAG_COOKIE = 'spike-bag'

/** An absent cookie is a bag seeded with both fixture items; an empty one is an empty bag. */
export async function bagLines(): Promise<number[]> {
  const raw = (await cookies()).get(BAG_COOKIE)?.value
  if (raw === undefined) return SPIKE_ITEMS.map((item) => item.publicId)
  return raw
    .split('.')
    .map(Number)
    .filter((id) => SPIKE_ITEMS.some((item) => item.publicId === id))
}
