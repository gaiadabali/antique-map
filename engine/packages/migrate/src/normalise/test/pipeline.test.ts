// A crawled record end to end, the review file's shape, the tables' guard
// and the CLI over a throwaway data directory — synthetic records only.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

import type { PublicProductRecord } from '../../sources/public-read/index.ts'
import { fromCatalogueRow, fromPublicRead } from '../adapters.ts'
import { normaliseAll, normaliseRecord } from '../record.ts'
import { countFields, reviewRows, toCsv } from '../review.ts'
import { DEFAULT_TABLES, parseTables } from '../tables.ts'

function crawled(overrides: Partial<PublicProductRecord> = {}): PublicProductRecord {
  return {
    source: 'public-read',
    legacyId: 9001,
    path: '/product/9001-mock-chart',
    slug: 'mock-chart',
    fetchedAt: null,
    availability: 'listed',
    soldEvidence: [],
    heading: 'Mock Maker',
    longTitle: 'Nieuwe Pascaert (mock long title) by Mock Maker',
    fields: [
      { label: 'Title', value: 'Mock chart - Year 1689' },
      { label: 'Publication Place / Date', value: 'Leiden / 1689 (first edition)' },
      { label: 'Image Dimensions', value: '450 x 380 mm' },
      { label: 'Color', value: '' },
      { label: 'Condition', value: 'G+ / Study image carefully' },
      { label: 'Product Price', value: 'USD 1,380' },
      { label: 'Product Number', value: 'SKU #M.Dav5' },
    ],
    cardTitle: 'Mock chart - Year 1689',
    cardFields: [{ label: 'Year', value: 'null' }],
    cardPrice: 'USD 1,380',
    maker: { legacyId: 1, name: 'Mock Maker', path: '/mapmaker/1-mock-maker' },
    categories: [
      { legacyId: 1, name: 'Mock Maps', path: '/category/1-mock-maps' },
      { legacyId: 1, name: 'Mock Maps', path: '/category/1-mock-maps' },
      { legacyId: 2, name: 'Mock Charts', path: '/category/2-mock-charts' },
    ],
    descriptionHtml: '<p>A mock chart.</p><p>( Ref: Mockley, R.V. (Atlas) 12. )</p>',
    images: [],
    ...overrides,
  }
}

describe('a crawled record through every normaliser', () => {
  const record = normaliseRecord(
    fromPublicRead(crawled(), DEFAULT_TABLES, { widthPx: 3000, heightPx: 2400 }),
    DEFAULT_TABLES,
  )

  it('splits place and date, keeps the note, and orients the size by the image', () => {
    expect(record.fields.date.value).toEqual({
      precision: 'exact',
      from: 1689,
      to: null,
      display: null,
    })
    expect(record.fields.place.value).toBe('Leiden')
    expect(record.fields.date.raw).toBe('Leiden / 1689 (first edition)')
    expect(record.publicationNote).toBe('first edition')
    expect(record.fields.orientation.value).toBe('landscape')
    expect(record.sizes).toEqual({ image: { heightMm: 380, widthMm: 450 }, sheet: null })
  })

  it('reads the price, the stock number without its label, and de-duplicates categories', () => {
    expect(record.fields.price.value).toEqual({
      mode: 'fixed',
      base: { amount: 138000, currency: 'USD' },
    })
    expect(record.fields.stockNumber.value).toEqual({
      value: 'M.Dav5',
      prefix: 'M',
      pattern: 'named',
    })
    expect(record.fields.categories.value?.map((category) => category.legacyId)).toEqual([1, 2])
    expect(record.fields.colour.status).toBe('empty')
    expect(record.fields.references.value).toEqual([{ source: 'Mockley, R.V. (Atlas)', ref: '12' }])
  })

  it('separates the hook title from the original, moving the maker’s byline out', () => {
    expect(record.fields.title.value).toEqual({ title: 'Mock chart', seoSuffixes: ['Year 1689'] })
    expect(record.fields.originalTitle.value).toEqual({
      title: 'Nieuwe Pascaert (mock long title)',
      seoSuffixes: ['by Mock Maker'],
    })
  })

  it('sends a sold item’s dash to empty, not review', () => {
    const sold = crawled({
      availability: 'sold',
      fields: crawled().fields.map((field) =>
        field.label === 'Product Price' ? { ...field, value: '-' } : field,
      ),
    })
    expect(
      normaliseRecord(fromPublicRead(sold, DEFAULT_TABLES, null), DEFAULT_TABLES).fields.price
        .status,
    ).toBe('empty')
  })
})

describe('the review file', () => {
  const records = normaliseAll(
    [
      fromCatalogueRow({
        legacyId: 1,
        sku: 'M.0001',
        size: '40 b7 22 cm.',
        condition: '=HYPERLINK("x")',
      }),
      fromCatalogueRow({
        legacyId: 2,
        sku: 'M.0001',
        year: 'Leiden',
        title: 'A title, with "quotes"',
      }),
    ],
    DEFAULT_TABLES,
  )
  const rows = reviewRows(records)

  it('flags a stock number two records share, on both records', () => {
    expect(rows.filter((row) => row.field === 'stockNumber').map((row) => row.recordId)).toEqual([
      1, 2,
    ])
  })

  it('carries record id, field, raw and proposal side by side, as CSV safe to open in a spreadsheet', () => {
    const csv = toCsv(rows)
    const [header, ...lines] = csv.trimEnd().split('\r\n')
    expect(header).toBe('source,recordId,path,field,raw,proposal,confidence,reason')
    expect(lines.some((line) => line.startsWith('catalogue,1,,dimensions,40 b7 22 cm.,'))).toBe(
      true,
    )
    expect(csv).toContain('"{""image"":{""sidesMm"":[400,220],""unit"":""cm""},""sheet"":null}"')
    expect(csv).not.toMatch(/,=HYPERLINK/)
    expect(csv).toContain(`,"'=HYPERLINK(""x"")",`)
  })

  it('counts parsed, review and empty per field, every record once', () => {
    const counts = countFields(records)
    for (const field of Object.values(counts))
      expect(field.parsed + field.review + field.empty).toBe(2)
    expect(counts.dimensions).toEqual({ parsed: 0, review: 1, empty: 1 })
  })
})

describe('parseTables — store wording is data, checked like config', () => {
  it('lays a file over the defaults', () => {
    const tables = parseTables({ '//': 'a note', stockPrefixes: ['M', 'P'] })
    expect(tables.stockPrefixes).toEqual(['M', 'P'])
    expect(tables.grades).toBe(DEFAULT_TABLES.grades)
  })

  it.each([
    [{ gradez: [] }, 'unknown field "gradez"'],
    [{ stockPrefixes: 'M' }, '"stockPrefixes" has the wrong shape'],
    [{ grades: [] }, '"grades" is empty'],
    [{ grades: [{ aliases: [] }] }, 'grades[0] needs a "code"'],
    [{ currencyExponents: { USD: 'two' } }, '"currencyExponents" has the wrong shape'],
  ])('refuses %j', (input, message) => {
    expect(() => parseTables(input)).toThrow(message)
  })
})

describe('the CLI', () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'normalise-cli-'))
  afterAll(() => rmSync(dataDir, { recursive: true, force: true }))

  it('writes the normalised records and the review file into the data dir and prints counts per field', () => {
    const products = join(dataDir, 'public-read', 'products')
    mkdirSync(products, { recursive: true })
    writeFileSync(join(products, '9001.json'), JSON.stringify(crawled()))
    writeFileSync(
      join(products, '9002.json'),
      JSON.stringify(crawled({ legacyId: 9002, path: '/product/9002-x' })),
    )
    const cli = fileURLToPath(new URL('../cli.ts', import.meta.url))
    const run = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        '--disable-warning=ExperimentalWarning',
        cli,
        'public-read',
        '--data-dir',
        dataDir,
      ],
      { encoding: 'utf8' },
    )
    expect(run.stderr).toBe('')
    expect(run.stdout).toMatch(/^2 records \(public-read\)/)
    expect(run.stdout).toMatch(/dimensions\s+2\s+0\s+0/)
    expect(run.stdout).toMatch(/orientation\s+0\s+2\s+0/)
    const out = join(dataDir, 'normalised', 'public-read')
    expect(readFileSync(join(out, 'records.jsonl'), 'utf8').trim().split('\n')).toHaveLength(2)
    const review = readFileSync(join(out, 'review.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
    expect(review.map((row) => row.field)).toEqual([
      'orientation',
      'stockNumber',
      'orientation',
      'stockNumber',
    ])
    expect(readFileSync(join(out, 'review.csv'), 'utf8')).toMatch(
      /^source,recordId,path,field,raw,proposal/,
    )
    expect(JSON.parse(readFileSync(join(out, 'summary.json'), 'utf8')).records).toBe(2)
  })
})
