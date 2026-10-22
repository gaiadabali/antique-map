/**
 * Regenerates the committed gallery-sample layer (DATA.md §2): the deterministic 50-record
 * antiques file and its 640-px image copies, byte-identical for the same legacy data. The
 * committed files are what `pnpm data:seed --layer gallery-sample` imports — a fresh checkout
 * seeds the sample without the legacy data on disk. Run it where the legacy data lives:
 *
 *   pnpm --filter @engine/cms gallery:sample   (LEGACY_DATA_DIR or ../indies-legacy-data)
 *
 * The image cells in the committed CSV are `images/<old id>-<image id>.jpg`, relative to this
 * folder's `data/` — the seed runner resolves them when it imports. Resizing keeps no metadata
 * (sharp strips it by default), and never enlarges: a legacy photograph already under 640 px
 * wide is copied as it is.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

import { antiqueCsv, antiqueRows } from './rows'
import { legacyDataDir, loadImages, loadRecords, type LegacyImage } from './records'
import { pickSample } from './pick'

const SAMPLE_WIDTH = 640
const JPEG_QUALITY = 65

const here = import.meta.dirname
const dataDir = join(here, 'data')
const imagesDir = join(dataDir, 'images')

type Sharp = (input: string) => {
  resize: (opts: { width: number; withoutEnlargement: boolean }) => {
    jpeg: (opts: { quality: number }) => { toFile: (dest: string) => Promise<unknown> }
  }
}

/** sharp is `@engine/media`'s dependency; this one script borrows it from there. */
const sharpImport = createRequire(
  createRequire(import.meta.url).resolve('@engine/media/derivatives'),
)('sharp') as unknown as Sharp | { default: Sharp }
const sharp: Sharp = typeof sharpImport === 'function' ? sharpImport : sharpImport.default

async function main(): Promise<void> {
  const dir = legacyDataDir(process.argv[2])
  const records = loadRecords(dir)
  const images = loadImages(dir)
  const sample = pickSample(records, images)
  const legacyPathOf = (image: LegacyImage) =>
    join(dir, 'indies-gallery', 'public-read', image.file)
  const rows = antiqueRows(sample, images, legacyPathOf)

  // The committed layer keeps the images beside the CSV, named by the record they belong to.
  mkdirSync(imagesDir, { recursive: true })
  for (const record of sample) {
    const listed = images.get(record.legacyId) ?? []
    for (const image of listed) {
      await sharp(legacyPathOf(image))
        .resize({ width: SAMPLE_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY })
        .toFile(join(imagesDir, `${record.legacyId}-${image.legacyImageId}.jpg`))
    }
    // The row's cell names the committed copy, not the legacy original.
    const row = rows.find((candidate) => candidate.cells.legacy_id === String(record.legacyId))
    if (row) {
      row.cells.image_files = listed
        .map((image) => `images/${record.legacyId}-${image.legacyImageId}.jpg`)
        .join(';')
    }
  }

  mkdirSync(imagesDir, { recursive: true })
  const csv = antiqueCsv(rows)
  writeFileSync(join(dataDir, 'gallery-sample.csv'), csv, 'utf8')
  // The antiques template has no column for the review marks or the old categories, so the
  // committed layer carries them beside the CSV, keyed by the stock number (DATA.md §4).
  const marks = Object.fromEntries(
    rows.map((row) => [
      row.cells.stock_number ?? '',
      { categories: row.legacyCategories, review: row.reviewMarks },
    ]),
  )
  writeFileSync(join(dataDir, 'gallery-sample-marks.json'), JSON.stringify(marks, null, 2), 'utf8')
  const bytes = rows.reduce(
    (total, row) =>
      total +
      (row.cells.image_files ?? '')
        .split(';')
        .filter((file) => file !== '')
        .reduce(
          (sum, file) => sum + readFileSync(join(imagesDir, file.split('/').pop()!)).length,
          0,
        ),
    0,
  )
  console.log(
    `gallery-sample: ${rows.length} records, ${(bytes / (1024 * 1024)).toFixed(1)} MB of images, ` +
      `${csv.length.toLocaleString()} bytes of CSV, written to ${dataDir}`,
  )
}

try {
  await main()
} catch (error: unknown) {
  console.error(error)
  process.exit(1)
}
