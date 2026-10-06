/**
 * The seed runner (DATA.md §2): one layer, one call — `seedLayer`. Every gallery layer seeds the
 * vocabulary first (the import matches makers, places, grades and subjects against it and holds
 * what nothing matches), then runs the 3.7.a importer over the layer's antiques file; the shop
 * layer runs the four shop sheets. Every write is the importer's own — key-matched upserts, one
 * transaction per file — so seeding twice is a no-op. The gallery's review marks and old
 * categories ride into `works.legacy.categories` after the import (§4): carried, never cleaned.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ANTIQUE_COLUMNS } from '../import/kinds'
import { parseCsv, ImportError } from '../import/csv'
import { render } from '../import/report'
import { runImportFile, runImportPath, type RunOptions } from '../import/apply'
import type { ImportKind, ImportReport } from '../import/types'
import type { Payload } from 'payload'

import { antiqueCsv, antiqueRows, type AntiqueRow } from './gallery/rows'
import { legacyDataDir, loadImages, loadRecords, type LegacyImage } from './gallery/records'
import { seedVocabulary, type VocabularyReport } from './vocabulary/seed'

export const SEED_LAYERS = ['vocabulary', 'gallery-sample', 'gallery-full', 'shop'] as const
export type SeedLayer = (typeof SEED_LAYERS)[number]

export type SeedOptions = {
  readonly payload: Payload
  readonly dryRun?: boolean
  readonly publish?: boolean
  /** The CLI's cache collector context (`../import/cli-cache`); none inside a request. */
  readonly context?: RunOptions['context']
}

export type SeedRun = {
  readonly layer: SeedLayer
  readonly vocabulary?: VocabularyReport
  readonly imports: readonly ImportReport[]
  /** The works whose `legacy.categories` now carry the review marks and old categories. */
  readonly marked: number
}

export async function seedLayer(layer: SeedLayer, options: SeedOptions): Promise<SeedRun> {
  const { payload, dryRun = false, publish = false } = options
  const { context } = options
  const runOptions: Omit<RunOptions, 'payload'> = { runner: 'seed', dryRun, publish, context }

  if (layer === 'vocabulary') {
    return { layer, vocabulary: await seedVocabulary(payload, context), imports: [], marked: 0 }
  }

  // Every other layer imports against the vocabulary — the shop's products match its categories.
  const vocabulary = await seedVocabulary(payload, context)

  if (layer === 'shop') {
    const imports: ImportReport[] = []
    for (const kind of ['products', 'stores', 'stock', 'discounts'] as const) {
      imports.push(await runImportPath(kind, shopFile(kind), { payload, ...runOptions }))
    }
    return { layer, vocabulary, imports, marked: 0 }
  }

  const { bytes, name, rows } = layer === 'gallery-sample' ? sampleLayer() : fullLayer()
  const report = await runImportFile('antiques' as ImportKind, name, bytes, {
    payload,
    ...runOptions,
  })
  const marked = dryRun ? 0 : await carryMarks(payload, rows, context)
  return { layer, vocabulary, imports: [report], marked }
}

const shopFile = (kind: ImportKind) =>
  fileURLToPath(new URL(`./shop/data/${kind}.csv`, import.meta.url))

/**
 * The committed sample's rows, read back from the files the generator wrote (DATA.md §2): the
 * CSV, with the marks sidecar attached by stock number. `withImages` resolves the image cells to
 * the committed 640-px copies' paths; without it the cells are cleared (a test that cannot
 * upload, whose rows then carry the `review:images` mark, which is the truth of it).
 */
export function sampleRows(options?: { withImages?: boolean }): readonly AntiqueRow[] {
  const withImages = options?.withImages ?? true
  let csvText: string
  try {
    csvText = new TextDecoder().decode(
      readFileSync(new URL('./gallery/data/gallery-sample.csv', import.meta.url)),
    )
  } catch {
    throw new ImportError(
      'The gallery-sample CSV is not in the repo (seed/gallery/data/gallery-sample.csv).',
      'Regenerate it with `pnpm --filter @engine/cms gallery:sample` where the legacy data lives.',
    )
  }
  const sheet = parseCsv('gallery-sample.csv', utf8(csvText), 'antiques', ANTIQUE_COLUMNS)
  // The marks sidecar: what the generator carried beside the CSV, keyed by stock number (§4).
  const marks = JSON.parse(
    new TextDecoder().decode(
      readFileSync(new URL('./gallery/data/gallery-sample-marks.json', import.meta.url)),
    ),
  ) as Record<string, { categories: readonly string[]; review: readonly string[] }>
  return sheet.rows.map((sheetRow) => {
    const cells: Record<string, string> = {}
    ANTIQUE_COLUMNS.forEach((column, index) => {
      cells[column] = sheetRow.cells[index] ?? ''
    })
    if (withImages) {
      // The committed cells name files beside the CSV; the import reads paths from disk.
      cells.image_files = cells
        .image_files!.split(';')
        .filter((file) => file !== '')
        .map((file) => fileURLToPath(new URL(`./gallery/data/${file}`, import.meta.url)))
        .join(';')
    } else {
      cells.image_files = ''
    }
    const carried = marks[cells.stock_number ?? ''] ?? { categories: [], review: [] }
    return {
      cells,
      legacyCategories: [...carried.categories],
      reviewMarks: [...carried.review],
    }
  })
}

/** The committed sample as the import takes it: file name and bytes. */
function sampleLayer(): { bytes: Uint8Array; name: string; rows: readonly AntiqueRow[] } {
  const rows = sampleRows()
  return { bytes: utf8(antiqueCsv(rows)), name: 'gallery-sample.csv', rows }
}

/** The full layer: every normalised record in LEGACY_DATA_DIR, generated in memory (§2). */
function fullLayer(): { bytes: Uint8Array; name: string; rows: readonly AntiqueRow[] } {
  const dir = legacyDataDir()
  const records = loadRecords(dir)
  const images = loadImages(dir)
  const legacyPathOf = (image: LegacyImage) =>
    join(dir, 'indies-gallery', 'public-read', image.file)
  const rows = antiqueRows(records, images, legacyPathOf)
  return { bytes: utf8(antiqueCsv(rows)), name: 'gallery-full.csv', rows }
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

/**
 * Writes each work's `legacy.categories` = its old category names + the row's `review:` marks
 * (DATA.md §4) — the antiques template has no column for them, so the run carries them here, and
 * the review queue reads them. A work already carrying the same list is left alone.
 */
export async function carryMarks(
  payload: Payload,
  rows: readonly AntiqueRow[],
  context: RunOptions['context'] = undefined,
): Promise<number> {
  const wanted = rows
    .filter((row) => row.reviewMarks.length > 0 || row.legacyCategories.length > 0)
    .map((row) => ({
      stockNumber: row.cells.stock_number ?? '',
      categories: [...row.legacyCategories, ...row.reviewMarks],
    }))
  let marked = 0
  for (let start = 0; start < wanted.length; start += 200) {
    const chunk = wanted.slice(start, start + 200)
    const stockNumbers = chunk.map((entry) => entry.stockNumber)
    const { docs } = await payload.find({
      collection: 'works',
      overrideAccess: true,
      depth: 0,
      limit: 200,
      where: { stockNumber: { in: stockNumbers } },
    })
    const byStock = new Map(
      docs.map((doc) => [String((doc as { stockNumber?: string }).stockNumber), doc]),
    )
    for (const entry of chunk) {
      const doc = byStock.get(entry.stockNumber) as
        | {
            id: number
            legacy?: { productId?: number; sku?: string; url?: string; categories?: string[] }
          }
        | undefined
      if (!doc) continue
      const current = doc.legacy?.categories ?? []
      if (
        current.length === entry.categories.length &&
        current.every((value, index) => value === entry.categories[index])
      ) {
        continue
      }
      await payload.update({
        collection: 'works',
        id: doc.id,
        overrideAccess: true,
        ...(context ? { context } : {}),
        data: {
          legacy: {
            ...(doc.legacy?.productId !== undefined ? { productId: doc.legacy.productId } : {}),
            ...(doc.legacy?.sku ? { sku: doc.legacy.sku } : {}),
            ...(doc.legacy?.url ? { url: doc.legacy.url } : {}),
            categories: entry.categories,
          },
        },
      })
      marked += 1
    }
  }
  return marked
}

/** The layer's import reports as the owner reads them (DATA.md §4), for the CLI to print. */
export function renderSeedRun(run: SeedRun): string {
  const lines: string[] = []
  if (run.vocabulary) {
    const v = run.vocabulary
    lines.push(
      `vocabulary: places ${v.places.created} created / ${v.places.present} present, ` +
        `terms ${v.terms.created} / ${v.terms.present}, makers ${v.makers.created} / ` +
        `${v.makers.present}, site-settings ${v.siteSettings}`,
    )
  }
  for (const report of run.imports) lines.push(render(report).trimEnd())
  if (run.layer.startsWith('gallery-') && !run.imports[0]?.dryRun) {
    lines.push(`review marks carried into legacy.categories: ${run.marked} work(s)`)
  }
  return lines.join('\n')
}
