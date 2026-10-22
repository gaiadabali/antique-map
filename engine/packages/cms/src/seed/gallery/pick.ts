/**
 * The sample pick (DATA.md §2): 50 of the legacy records, chosen by a rule, not a mood — the
 * same command rebuilds byte-identical files. The rule: records that carry at least one image,
 * in old-id order, spread evenly across the whole run so every era and every kind of record is
 * in; the first and last records are always in.
 */
import type { LegacyImage, NormalisedGalleryRecord } from './records'

export const SAMPLE_COUNT = 50

/** The evenly spread window of `count` indices over `total`, deterministic for a given total. */
export function spreadIndices(total: number, count: number): readonly number[] {
  if (total <= count) return [...Array(total).keys()]
  const indices: number[] = []
  for (let i = 0; i < count; i += 1) {
    indices.push(Math.round((i * (total - 1)) / (count - 1)))
  }
  return [...new Set(indices)]
}

/** The sample: `SAMPLE_COUNT` records that have an image, spread across the id order. */
export function pickSample(
  records: readonly NormalisedGalleryRecord[],
  images: ReadonlyMap<number, readonly LegacyImage[]>,
): readonly NormalisedGalleryRecord[] {
  const withImages = records.filter((record) => (images.get(record.legacyId) ?? []).length > 0)
  const indices = spreadIndices(withImages.length, SAMPLE_COUNT)
  return indices.map((index) => withImages[index]!)
}
