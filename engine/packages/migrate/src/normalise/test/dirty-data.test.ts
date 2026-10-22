// One test per dirty-data case MIGRATION.md §4 lists, named after the case,
// run on the mock dump's own rows (D42: synthetic, `test/fixtures/
// mock-products.jsonl` is products.sql's extract of
// sources/laravel-catalogue/fixtures/mock-dump.sql, staff-only columns left
// out) and, where the case lives in the crawled shape, on a synthetic
// public-read record.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { fromCatalogueRow, type CatalogueRow } from '../adapters.ts'
import { normaliseAll, type NormalisedRecord } from '../record.ts'
import { reviewRows } from '../review.ts'
import { DEFAULT_TABLES, parseTables } from '../tables.ts'

const rows = readFileSync(
  fileURLToPath(new URL('./fixtures/mock-products.jsonl', import.meta.url)),
  'utf8',
)
  .split('\n')
  .filter((line) => line.trim() !== '')
  .map((line) => JSON.parse(line) as CatalogueRow)

/** The store's own wording, as the brand's tables file would give it (TASKS.md 7.2 follow-up). */
const tables = parseTables({
  conditionBoilerplate: ['Study images carefully', 'Study image carefully'],
  seoSuffixes: ['Extremely rare map'],
  grades: [
    ...DEFAULT_TABLES.grades.filter((term) => term.code !== 'G'),
    { code: 'G', aliases: ['Good'], equivalent: null },
  ],
})
const records = normaliseAll(
  rows.map((row) => fromCatalogueRow(row)),
  tables,
)
const byId = (id: number): NormalisedRecord => {
  const record = records.find((candidate) => candidate.legacyId === id)
  if (record === undefined) throw new Error(`no mock row ${id}`)
  return record
}

describe('MIGRATION.md §4 dirty data, on the mock dump', () => {
  it('Year: null — the text "null" goes to review, and a NULL year is left empty, never invented', () => {
    expect(byId(1302).fields.date).toMatchObject({ raw: 'null', status: 'review', value: null })
    expect(byId(1300).fields.date).toMatchObject({ raw: null, status: 'empty', value: null })
  })

  it('Year: Leiden — a place in the year field goes to review, proposed as the place', () => {
    const { date, place } = byId(1301).fields
    expect(date).toMatchObject({ raw: 'Leiden', status: 'review', value: null })
    expect(place).toMatchObject({ status: 'review', value: null, proposal: 'Leiden' })
  })

  it('Size: 40 b7 22 cm. — the typo for "by" is proposed, not assumed', () => {
    const { dimensions } = byId(1044).fields
    expect(dimensions.status).toBe('review')
    expect(dimensions.value).toBeNull()
    expect(dimensions.proposal).toEqual({ image: { sidesMm: [400, 220], unit: 'cm' }, sheet: null })
    expect(dimensions.reason).toContain('b7')
  })

  it('mixed mm/cm — both become whole millimetres', () => {
    expect(byId(1009).fields.dimensions.value?.image?.sidesMm).toEqual([450, 380])
    expect(byId(1001).fields.dimensions.value?.image?.sidesMm).toEqual([450, 380])
    expect(byId(1302).fields.dimensions.value?.image?.sidesMm).toEqual([365, 280])
    expect(byId(2090).fields.dimensions.value?.image?.sidesMm).toEqual([510, 395])
  })

  it('"x"/"by" — "23x17cm", "450 x 380 mm" and "45 by 38 cm." read alike', () => {
    expect(byId(1015).fields.dimensions.value?.image).toEqual({ sidesMm: [230, 170], unit: 'cm' })
    expect(byId(1009).fields.dimensions.status).toBe('parsed')
    expect(byId(1001).fields.dimensions.status).toBe('parsed')
  })

  it('no inches anywhere — a size in inches goes to review instead of being converted', () => {
    const inches = normaliseAll([fromCatalogueRow({ legacyId: 1, size: '18 x 15 in.' })], tables)
    expect(inches[0]?.fields.dimensions).toMatchObject({ status: 'review', value: null })
    for (const record of records)
      expect(record.fields.dimensions.reason ?? '').not.toContain('inches')
  })

  it('empty colour fields — "" and NULL are empty, never sent to review', () => {
    for (const id of [1009, 1301, 1015, 1101]) {
      expect(byId(id).fields.colour).toMatchObject({ status: 'empty', value: null })
    }
  })

  it('missing makers — a NULL maker and a placeholder stay empty, never invented', () => {
    for (const id of [1015, 1500, 1600]) {
      expect(byId(id).fields.maker).toMatchObject({ status: 'empty', value: null })
    }
    expect(byId(1250).fields.maker).toMatchObject({
      status: 'empty',
      reason: 'a placeholder maker',
    })
    expect(byId(1044).fields.maker.value).toEqual({ legacyId: 7, name: 'Francois Valentijn' })
  })

  it('condition typed freehand — "G+ / Study images carefully" and "…image carefully" are one grade', () => {
    expect(byId(1101).fields.condition.value).toEqual({ grade: 'G+', notes: null })
    expect(byId(1044).fields.condition.value).toEqual({ grade: 'G+', notes: null })
    expect(byId(1603).fields.condition.value).toEqual({
      grade: 'G',
      notes: 'some foxing in the margins',
    })
    expect(byId(1800).fields.condition.value).toEqual({ grade: 'G', notes: 'linen backed' })
    expect(byId(1200).fields.condition).toMatchObject({ raw: 'VG-', status: 'review', value: null })
  })

  it('SKUs in more than two patterns — M.1044 and M.Dav5 are both preserved exactly', () => {
    expect(byId(1101).fields.stockNumber.value).toEqual({
      value: 'M.1044',
      prefix: 'M',
      pattern: 'numbered',
    })
    expect(byId(1044).fields.stockNumber.value).toEqual({
      value: 'M.Dav5',
      prefix: 'M',
      pattern: 'named',
    })
    expect(byId(2090).fields.stockNumber.value?.value).toBe('M.Dav12')
    expect(byId(1700).fields.stockNumber.value?.prefix).toBe('F')
  })

  it('one chart carrying 16 category tags — every tag is kept for the curator’s mapping', () => {
    expect(byId(1009).fields.categories.value).toHaveLength(16)
    expect(byId(1701).fields.categories.status).toBe('empty')
  })

  it('anything it cannot parse with confidence goes to the review queue, raw beside proposal', () => {
    const queue = reviewRows(records)
    const typo = queue.find((row) => row.recordId === 1044 && row.field === 'dimensions')
    expect(typo).toMatchObject({ raw: '40 b7 22 cm.' })
    expect(JSON.parse(typo?.proposal ?? 'null')).toEqual({
      image: { sidesMm: [400, 220], unit: 'cm' },
      sheet: null,
    })
    for (const row of queue) {
      const field = byId(row.recordId).fields[row.field]
      expect(field.value).toBeNull()
      expect(row.raw).toBe(field.raw)
    }
  })
})

describe('MIGRATION.md §4 normalise steps, on the mock dump', () => {
  it('dates → {from, to, precision}: exact, circa, range and century', () => {
    expect(byId(1001).fields.date.value).toEqual({
      precision: 'exact',
      from: 1661,
      to: null,
      display: null,
    })
    expect(byId(1604).fields.date.value).toMatchObject({ precision: 'circa', from: 1880 })
    expect(byId(1850).fields.date.value).toMatchObject({ precision: 'range', from: 1724, to: 1726 })
    expect(byId(2050).fields.date.value).toEqual({
      precision: 'range',
      from: 1901,
      to: 2000,
      display: '20th century',
    })
  })

  it('prices → Money in USD minor units, and "On Request" → priceOnRequest', () => {
    expect(byId(1009).fields.price.value).toEqual({
      mode: 'fixed',
      base: { amount: 3880000, currency: 'USD' },
    })
    expect(byId(1044).fields.price.value).toEqual({ mode: 'on-request', base: null })
    expect(byId(1850).fields.price.value).toEqual({ mode: 'on-request', base: null })
    expect(byId(1350).fields.price.status).toBe('empty')
  })

  it('inline "(Ref: …)" → structured references where the pattern is unambiguous', () => {
    expect(byId(1044).fields.references.value).toEqual([
      { source: 'Tooley, R.V. (Australia)', ref: '1268' },
    ])
    expect(byId(1101).fields.references.value).toEqual([
      { source: 'Tiele', ref: '1234' },
      { source: 'Schilder', ref: '42' },
    ])
    expect(byId(2090).fields.references).toMatchObject({ status: 'review', value: null })
  })

  it('titles → hook title and original title, "- Year 1661" / "- Extremely rare map" moved out', () => {
    expect(byId(1001).fields.title.value).toEqual({
      title: 'Southeast Asia map',
      seoSuffixes: ['Year 1661'],
    })
    expect(byId(1044).fields.title.value).toEqual({
      title: 'Kaart van het Eyland Bali',
      seoSuffixes: ['Extremely rare map'],
    })
    expect(byId(1044).fields.originalTitle.value?.title).toBe(
      'Kaart van het Eyland Bali (mock title)',
    )
    const both = byId(2000).fields.title
    expect(both.proposal?.seoSuffixes).toEqual(
      expect.arrayContaining(['Year 1640', 'Extremely rare map']),
    )
  })
})
