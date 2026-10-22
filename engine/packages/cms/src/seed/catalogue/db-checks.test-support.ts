/**
 * The shop-catalogue layer's checks on a real database (task 10.6.e), called by `seed.db.test.ts`.
 * The layer reads `LEGACY_DATA_DIR`, so the checks build a small invented folder there (two
 * catalogue designs and one Instagram design, with two of the committed 640-px sample pictures)
 * rather than depend on the owner's data being on the machine.
 */
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { invalidationBatch } from '@engine/cache'
import type { Payload } from 'payload'
import { expect } from 'vitest'

import { seedLayer } from '../run'
import { mockProductSkus } from './read'

const sample = (file: string) =>
  fileURLToPath(new URL(`../gallery/data/images/${file}`, import.meta.url))

/** The fixture's pictures as the layer stores them: the product's name, then the kind. */
const DESIGN = 'fixture-design-1849.jpg'
const POSTER = 'fixture-poster.jpg'
const POSTER_FRAMED = 'fixture-poster-framed.jpg'

function makeFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'catalogue-fixture-'))
  const designs = join(dir, 'old-east-indies', 'designs')
  const instagram = join(dir, 'old-east-indies', 'instagram')
  for (const folder of [designs, instagram]) mkdirSync(join(folder, 'images'), { recursive: true })
  const design = (code: string, over: Record<string, unknown>) => ({
    code,
    title: 'Fixture design',
    heading: 'Fixture design',
    date: { display: '1849', precision: 'exact', year: 1849 },
    artist: null,
    catalogues: ['Maps'],
    description_en: 'First paragraph.\n\nSecond paragraph.',
    name_id: 'Rancangan contoh',
    description_id: 'Paragraf pertama.\n\nParagraf kedua.',
    image: { file: `images/${code}.jpg` },
    ...over,
  })
  const lines = [
    design('MP.901', {}),
    design('MP.902', {
      catalogues: ['Animals'],
      date: { display: '1600', precision: 'circa', year: 1600 },
    }),
  ]
  writeFileSync(
    join(designs, 'designs.jsonl'),
    lines.map((line) => JSON.stringify(line)).join('\n'),
  )
  copyFileSync(sample('1018-1340.jpg'), join(designs, 'images', 'MP.901.jpg'))
  copyFileSync(sample('1055-1399.jpg'), join(designs, 'images', 'MP.902.jpg'))
  copyFileSync(sample('107-113.jpg'), join(instagram, 'images', 'fx-c0.jpg'))
  copyFileSync(sample('1093-1436.jpg'), join(instagram, 'images', 'fx-c1.jpg'))
  writeFileSync(
    join(instagram, 'products.json'),
    JSON.stringify({
      products: [
        {
          id: 'IG-Dcu3iFkgd_W',
          title: 'Fixture poster',
          name_id: 'Poster contoh',
          date: { display: null, precision: 'none', year: null },
          description_en: 'A poster.',
          description_id: 'Sebuah poster.',
          images: [
            { file: 'images/fx-c1.jpg', kind: 'mockup-framed' },
            { file: 'images/fx-c0.jpg', kind: 'artwork' },
          ],
        },
      ],
    }),
  )
  return dir
}

type Counted = { counts: { new: number; updated: number; rejected: number; held: number } }

export async function checkCatalogueLayer(payload: Payload): Promise<void> {
  const fixture = makeFixture()
  const previous = process.env.LEGACY_DATA_DIR
  process.env.LEGACY_DATA_DIR = fixture
  // Outside a request, the CLI's way: a batch's own collector on the run (`../cli.ts`), which a
  // publishing run needs for its cache hooks.
  const context = invalidationBatch().context()
  try {
    await seedLayer('shop', { payload })
    const first = await seedLayer('shop-catalogue', { payload, publish: true, context })
    for (const report of first.imports as unknown as Counted[]) {
      expect(report.counts.rejected).toBe(0)
      expect(report.counts.held).toBe(0)
    }
    // Twelve rows: four products (new) — the fixture's three and the committed addition
    // (`./data`, River Jurong) — and their eight variant rows, which report as updates of the
    // product they join (`import/apply-products.ts` applyVariantRow).
    expect((first.imports[0] as unknown as Counted).counts).toMatchObject({ new: 4, updated: 8 })
    expect(first.catalogue!.attach).toEqual({
      mediaCreated: 5,
      imagesSet: 4,
      published: 4,
      held: [],
    })
    expect(first.catalogue!.rehearsal).toEqual({ retired: 0, alreadyRetired: 0 })
    // The mocks seed as drafts: those with no variant are already off sale, so the 80 split between
    // "retired" now and "already retired" (`./retire.ts`); the states below prove all 80 are off.
    const retire = first.catalogue!.retire!
    expect(retire.retired + retire.alreadyRetired).toBe(80)
    expect(retire.retired).toBeGreaterThan(0)

    // The shop lists the four designs and none of the 80 mock products.
    const listed = await payload.find({
      collection: 'products',
      overrideAccess: false,
      depth: 0,
      limit: 200,
      where: { _status: { equals: 'published' } },
    })
    expect(listed.docs.map((doc) => (doc as { sku?: string }).sku).sort()).toEqual([
      'SEED-AP.2033',
      'SEED-IG01',
      'SEED-MP.901',
      'SEED-MP.902',
    ])

    // Role and provenance are set per picture; the mock-up carries the label's provenance. Each
    // picture is stored under its product's name and kind, never the extraction's code (MP.901).
    // Payload's local-disk storage (tests have no S3) adds `-1` to a name an earlier run left in
    // its folder, so the name the layer gave may carry that suffix.
    const media = await payload.find({
      collection: 'media',
      overrideAccess: true,
      depth: 0,
      limit: 50,
      sort: 'id',
      where: { filename: { like: 'fixture-' } },
    })
    const sameName = (stored: unknown, file: string) => {
      const dot = file.lastIndexOf('.')
      const [base, ext] = [file.slice(0, dot), file.slice(dot)]
      const name = String(stored)
      return (
        name === file ||
        (name.startsWith(`${base}-`) &&
          name.endsWith(ext) &&
          /^\d+$/.test(name.slice(base.length + 1, -ext.length)))
      )
    }
    const by = new Map(
      [DESIGN, POSTER, POSTER_FRAMED].map((file) => [
        file,
        media.docs.find((doc) => sameName((doc as { filename?: string }).filename, file)),
      ]),
    )
    const facts = (file: string) => {
      const doc = by.get(file) as { role?: string; provenance?: string; subject?: string }
      return [doc.subject, doc.role, doc.provenance]
    }
    expect(facts(DESIGN)).toEqual(['product', 'flat', 'photograph'])
    expect(facts(POSTER)).toEqual(['product', 'flat', 'photograph'])
    expect(facts(POSTER_FRAMED)).toEqual(['product', 'in-room', 'rendered'])
    const ig = (
      await payload.find({
        collection: 'products',
        overrideAccess: true,
        depth: 0,
        where: { sku: { equals: 'SEED-IG01' } },
      })
    ).docs[0] as unknown as {
      images: Array<{ image: number }>
      variants: Array<{ sku: string; price: number }>
    }
    expect(ig.images.map((row) => row.image)).toEqual([
      (by.get(POSTER) as { id: number }).id,
      (by.get(POSTER_FRAMED) as { id: number }).id,
    ])
    expect(ig.variants.map((variant) => [variant.sku, variant.price])).toEqual([
      ['SEED-IG01-M', 450_000],
      ['SEED-IG01-F', 950_000],
    ])

    // The mock products are unpublished with their variants off sale; stock for the new ones exists.
    const mock = await payload.find({
      collection: 'products',
      overrideAccess: true,
      depth: 0,
      limit: 200,
      where: { sku: { in: mockProductSkus() } },
    })
    expect(mock.docs).toHaveLength(80)
    for (const doc of mock.docs as unknown as Array<{
      _status: string
      variants?: Array<{ active: boolean }>
    }>) {
      expect(doc._status).toBe('draft')
      for (const variant of doc.variants ?? []) expect(variant.active).toBe(false)
    }
    const stock = await payload.find({
      collection: 'stock-levels',
      overrideAccess: true,
      depth: 0,
      limit: 1,
      where: { variantSku: { equals: 'SEED-MP.901-M' } },
    })
    expect(stock.totalDocs).toBeGreaterThan(0)

    // The same run twice changes nothing.
    const second = await seedLayer('shop-catalogue', { payload, publish: true, context })
    for (const report of second.imports as unknown as Counted[]) {
      expect(report.counts.new).toBe(0)
      expect(report.counts.updated).toBe(0)
    }
    expect(second.catalogue!.attach).toEqual({
      mediaCreated: 0,
      imagesSet: 0,
      published: 0,
      held: [],
    })
    expect(second.catalogue!.retire).toEqual({ retired: 0, alreadyRetired: 80 })
  } finally {
    if (previous === undefined) delete process.env.LEGACY_DATA_DIR
    else process.env.LEGACY_DATA_DIR = previous
    rmSync(fixture, { recursive: true, force: true })
  }
}
