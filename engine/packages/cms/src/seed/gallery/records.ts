/**
 * The legacy gallery's normalised records, in (`LEGACY_DATA_DIR`, default
 * `../indies-legacy-data`): `indies-gallery/normalised/<label>/records.jsonl` is what
 * `@engine/migrate`'s normalise CLI wrote (DATA.md §8) — never committed, so this reads it from
 * disk. A record's images are not in the normalised output; they sit on the crawled product JSON
 * (`indies-gallery/public-read/products/<id>.json`), joined here by the record's own id.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export type ParsedField<T> = {
  readonly raw: string | null
  readonly status: 'parsed' | 'review' | 'empty'
  readonly value: T | null
  readonly proposal: T | null
  readonly confidence: number
  readonly reason: string | null
}

export type NormalisedGalleryRecord = {
  readonly source: string
  readonly legacyId: number
  readonly path: string | null
  readonly status: { readonly listed: boolean; readonly sold: boolean; readonly deleted: boolean }
  readonly publisher: string | null
  readonly publicationNote: string | null
  readonly sizes: {
    readonly image: { heightMm: number; widthMm: number } | null
    readonly sheet: { heightMm: number; widthMm: number } | null
  } | null
  readonly fields: {
    readonly title: ParsedField<{ readonly title: string }>
    readonly originalTitle: ParsedField<{ readonly title: string }>
    readonly date: ParsedField<{
      readonly precision: string
      readonly from: number | null
      readonly to: number | null
      readonly display: string | null
    }>
    readonly place: ParsedField<string>
    readonly dimensions: ParsedField<unknown>
    readonly condition: ParsedField<{ readonly grade: string; readonly notes: string | null }>
    readonly references: ParsedField<unknown>
    readonly stockNumber: ParsedField<{ readonly value: string; readonly prefix: string }>
    readonly colour: ParsedField<string>
    readonly maker: ParsedField<{ readonly legacyId: number | null; readonly name: string }>
    readonly categories: ParsedField<
      ReadonlyArray<{ readonly legacyId: number; readonly name: string }>
    >
  }
}

/** A crawled product's image: the file path is relative to the site's `public-read` folder. */
export type LegacyImage = {
  readonly legacyImageId: number
  readonly file: string
  readonly bytes: number
}

/**
 * LEGACY_DATA_DIR, the way `@engine/migrate` resolves it (§8). The seed CLIs run with the cms
 * package as their cwd, so the checkout-relative default is tried both ways: against the cwd and
 * against this file's own location (the repo checkout root's parent).
 */
export function legacyDataDir(explicit?: string): string {
  const candidates =
    explicit !== undefined
      ? [explicit]
      : [
          ...(process.env.LEGACY_DATA_DIR ? [process.env.LEGACY_DATA_DIR] : []),
          '../indies-legacy-data',
          resolve(
            import.meta.dirname,
            '..',
            '..',
            '..',
            '..',
            '..',
            '..',
            '..',
            'indies-legacy-data',
          ),
        ]
  const dir = candidates.find((candidate) => existsSync(candidate))
  if (dir === undefined) {
    throw new Error(
      `Legacy data not found (tried: ${candidates.join(', ')}). Set LEGACY_DATA_DIR, or ` +
        'generate it with the migrate CLIs (docs/DATA.md §8).',
    )
  }
  return dir
}

/** The normalised records: one JSON object per line, in id order. */
export function loadRecords(dir: string, label = 'public-read'): NormalisedGalleryRecord[] {
  const file = join(dir, 'indies-gallery', 'normalised', label, 'records.jsonl')
  const lines = readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
  const records = lines.map((line) => JSON.parse(line) as NormalisedGalleryRecord)
  return records.toSorted((a, b) => a.legacyId - b.legacyId)
}

/** Each record's images, from the crawled product JSON, joined by the record's own id. */
export function loadImages(dir: string): Map<number, readonly LegacyImage[]> {
  const products = join(dir, 'indies-gallery', 'public-read', 'products')
  const map = new Map<number, readonly LegacyImage[]>()
  if (!existsSync(products)) return map
  for (const file of readdirSync(products)) {
    if (!file.endsWith('.json')) continue
    const product = JSON.parse(readFileSync(join(products, file), 'utf8')) as {
      legacyId: number
      images?: readonly LegacyImage[]
    }
    map.set(product.legacyId, product.images ?? [])
  }
  return map
}
