/**
 * The two cached reads of the spike (ARCHITECTURE.md §9): the record, the same for every visitor,
 * under `item:<id>` — invalidated with `revalidateTag(tag, 'max')`, so an edit is served stale
 * once while it revalidates; and availability, under `availability:<id>` — invalidated with
 * `revalidateTag(tag, { expire: 0 })`, so the next request waits for the new answer and a sold
 * item is never served as available from cache. The process serves one brand, so the brand is
 * part of every key by construction.
 */
import type { LocaleCode } from '@engine/config/schema'
import { cacheLife, cacheTag } from 'next/cache'

import { SPIKE_ITEMS } from './items'
import { readState, type Availability } from './store'

export type SpikeRecord = {
  readonly publicId: number
  readonly slug: string
  readonly title: string
  readonly edition: number
  /** When this entry was computed: a cache hit shows the time of the miss that filled it. */
  readonly computedAt: string
}

export const itemTag = (publicId: number) => `item:${publicId}`
export const availabilityTag = (publicId: number) => `availability:${publicId}`

export async function getItemRecord(
  publicId: number,
  locale: LocaleCode,
): Promise<SpikeRecord | null> {
  'use cache'
  cacheTag(itemTag(publicId))
  cacheLife('max')
  const item = SPIKE_ITEMS.find((each) => each.publicId === publicId)
  if (!item) return null
  return {
    publicId,
    slug: item.slug[locale],
    title: item.title[locale],
    edition: readState().edition[String(publicId)] ?? 1,
    computedAt: new Date().toISOString(),
  }
}

export async function getAvailability(publicId: number): Promise<Availability> {
  'use cache'
  cacheTag(availabilityTag(publicId))
  cacheLife('max')
  return readState().availability[String(publicId)] ?? 'available'
}
