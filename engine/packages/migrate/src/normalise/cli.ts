/**
 * Runs every normaliser over an extract and writes the result and the review
 * queue into LEGACY_DATA_DIR — never into git (TASKS.md 7.2.c).
 *
 *   cli.ts public-read [--in <dir>]           the crawled product JSON (default <data>/public-read/products)
 *   cli.ts catalogue   [--in <products.jsonl>] [--name <label>]
 *                                              a database extract (default <data>/mysql/<label>/extract/products.jsonl)
 *
 * Common: [--tables <json>] the brand's normalise tables (else the neutral defaults),
 * [--data-dir <dir>] (else LEGACY_DATA_DIR), [--out <label>] (the output folder's name).
 * Writes <data>/normalised/<label>/{records.jsonl, review.jsonl, review.csv, summary.json}
 * and prints parsed / review / empty per field.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import { parseArgs } from 'node:util'

import type { PublicProductRecord } from '../sources/public-read/index.ts'
import { legacyDataDir, resolveFromInvocation, workspaceRoot } from '../sources/public-read/env.ts'
import { fromCatalogueRow, fromPublicRead, type CatalogueRow } from './adapters.ts'
import { readImageSize, type ImageSize } from './image-size.ts'
import { FIELDS, normaliseAll, type LegacyProductInput } from './record.ts'
import { countFields, reasonsByField, reviewRows, toCsv, toJsonl } from './review.ts'
import { DEFAULT_TABLES, parseTables, type NormaliseTables } from './tables.ts'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    in: { type: 'string' },
    name: { type: 'string' },
    out: { type: 'string' },
    tables: { type: 'string' },
    'data-dir': { type: 'string' },
  },
})

function assertOutsideGit(dir: string): void {
  const root = workspaceRoot()
  if (root === null) return
  const inside = relative(root, dir).split(sep).join('/')
  const isInside = inside === '' || (!inside.startsWith('..') && !isAbsolute(inside))
  if (isInside && !inside.includes('content/legacy/raw')) {
    throw new Error(
      `refusing output dir ${dir}: normalised data stays outside git (MIGRATION.md §4)`,
    )
  }
}

function loadTables(): NormaliseTables {
  if (!values.tables) return DEFAULT_TABLES
  return parseTables(JSON.parse(readFileSync(resolveFromInvocation(values.tables), 'utf8')))
}

function publicReadInputs(dataDir: string, tables: NormaliseTables): LegacyProductInput[] {
  const readDir = join(dataDir, 'public-read')
  const dir = values.in ? resolveFromInvocation(values.in) : join(readDir, 'products')
  const base = values.in ? join(dir, '..') : readDir
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')) as PublicProductRecord)
    .sort((a, b) => a.legacyId - b.legacyId)
    .map((record) => fromPublicRead(record, tables, primaryImageSize(base, record)))
}

function primaryImageSize(base: string, record: PublicProductRecord): ImageSize | null {
  const file = record.images.find((image) => image.file !== null)?.file
  if (!file) return null
  const path = join(base, file)
  return existsSync(path) ? readImageSize(path) : null
}

function catalogueInputs(dataDir: string): LegacyProductInput[] {
  const label = values.name ?? 'catalogue'
  const file = values.in
    ? resolveFromInvocation(values.in)
    : join(dataDir, 'mysql', label, 'extract', 'products.jsonl')
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => fromCatalogueRow(JSON.parse(line) as CatalogueRow))
}

function run(command: string | undefined): void {
  if (command !== 'public-read' && command !== 'catalogue') {
    throw new Error(
      'usage: cli.ts public-read|catalogue [--in <path>] [--tables <json>] [--out <label>]',
    )
  }
  const dataDir = legacyDataDir(values['data-dir'])
  const tables = loadTables()
  const inputs =
    command === 'public-read' ? publicReadInputs(dataDir, tables) : catalogueInputs(dataDir)
  const records = normaliseAll(inputs, tables)
  const rows = reviewRows(records)
  const counts = countFields(records)

  const label =
    values.out ??
    (command === 'public-read' ? 'public-read' : `mysql-${values.name ?? 'catalogue'}`)
  const outDir = join(dataDir, 'normalised', label)
  assertOutsideGit(outDir)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'records.jsonl'), toJsonl(records))
  writeFileSync(join(outDir, 'review.jsonl'), toJsonl(rows))
  writeFileSync(join(outDir, 'review.csv'), toCsv(rows))
  const summary = {
    source: command,
    records: records.length,
    tables: values.tables ?? 'defaults',
    counts,
    reviewRows: rows.length,
    reasons: reasonsByField(rows),
  }
  writeFileSync(join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)

  const out = (line: string) => process.stdout.write(`${line}\n`)
  out(`${records.length} records (${command}) → ${outDir}`)
  out(`${'field'.padEnd(14)}${'parsed'.padStart(8)}${'review'.padStart(8)}${'empty'.padStart(8)}`)
  for (const field of FIELDS) {
    const { parsed, review, empty } = counts[field]
    out(
      `${field.padEnd(14)}${String(parsed).padStart(8)}${String(review).padStart(8)}${String(empty).padStart(8)}`,
    )
  }
  out(`review rows: ${rows.length}`)
}

try {
  run(positionals[0])
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
