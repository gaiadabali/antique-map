/**
 * The sample pick (DATA.md §2): chosen by a rule, not a mood — the same run always lands the
 * same 50 records, spread across the whole legacy id order, first and last always in.
 */
import { describe, expect, it } from 'vitest'

import { SAMPLE_COUNT, pickSample, spreadIndices } from './pick'
import type { NormalisedGalleryRecord } from './records'

const record = (legacyId: number): NormalisedGalleryRecord =>
  ({
    legacyId,
    fields: {},
  }) as unknown as NormalisedGalleryRecord

describe('the sample pick', () => {
  it('spreads evenly and always keeps the first and last', () => {
    const indices = spreadIndices(1000, 10)
    expect(indices.length).toBe(10)
    expect(indices[0]).toBe(0)
    expect(indices[9]).toBe(999)
    // Even spread: consecutive gaps differ by at most one.
    const gaps = indices.slice(1).map((index, i) => index - indices[i]!)
    expect(new Set(gaps).size).toBeLessThanOrEqual(2)
  })

  it('takes everything when the run is smaller than the sample', () => {
    expect(spreadIndices(20, 50).length).toBe(20)
  })

  it('is deterministic: the same records twice', () => {
    const images = new Map<number, readonly unknown[]>([
      [1, ['a']],
      [2, ['a']],
      [3, ['a']],
    ])
    const records = [1, 2, 3].map(record)
    expect(pickSample(records, images)).toEqual(pickSample(records, images))
  })

  it('picks SAMPLE_COUNT records that carry an image', () => {
    const withImages = Array.from({ length: 2000 }, (_, i) => record(i + 1))
    const images = new Map(withImages.map((r) => [r.legacyId, ['img']]))
    const picked = pickSample(withImages, images)
    expect(picked.length).toBe(SAMPLE_COUNT)
    expect(new Set(picked.map((r) => r.legacyId)).size).toBe(SAMPLE_COUNT)
    expect(picked[0]!.legacyId).toBe(1)
    expect(picked.at(-1)!.legacyId).toBe(2000)
  })
})