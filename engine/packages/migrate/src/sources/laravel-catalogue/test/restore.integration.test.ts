// TASKS.md 7.1.f end to end: the mock dump restored into a throwaway MySQL
// container by the harness, its schema discovered, and its rows extracted
// by SQL — then the container removed. It needs a Docker engine, so it runs
// when MIGRATE_MYSQL_IT=1 (a setup state, CONVENTIONS.md §8: with the flag
// set and Docker refusing, it fails rather than skips).
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

import { removeContainer } from '../docker.ts'
import { dumpTables, runQueries } from '../extract.ts'
import { restoreDump } from '../restore.ts'
import { discoverSchema } from '../schema.ts'

const enabled = process.env.MIGRATE_MYSQL_IT === '1'
const container = 'migrate-legacy-it'
const fixtures = fileURLToPath(new URL('../fixtures/', import.meta.url))

type Row = Record<string, unknown>
const read = (file: string): Row[] =>
  readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Row)

describe.runIf(enabled)('the mock dump, restored and extracted by SQL', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'mock-restore-'))
  afterAll(async () => {
    await removeContainer(container)
  })

  it('restores, discovers the schema, extracts every entity and dumps every table', async () => {
    const report = await restoreDump({
      dumpPath: join(fixtures, 'mock-dump.sql'),
      container,
      image: process.env.MIGRATE_MYSQL_IMAGE ?? 'mysql:8.4',
      replace: true,
    })
    expect(report.database).toBe('legacy')
    expect(report.tables).toHaveLength(15)
    const rows = Object.fromEntries(report.tables.map((table) => [table.table, table.rows]))
    expect(rows).toMatchObject({ products: 30, product_images: 31, category_product: 88, users: 5 })

    const schema = await discoverSchema(container, report.database)
    const users = schema.tables.find((table) => table.table === 'users')
    expect(users?.columns.find((column) => column.column === 'password')?.sensitivity).toBe(
      'secret',
    )

    const extracts = await runQueries({
      container,
      database: report.database,
      queriesDir: join(fixtures, 'mock-queries'),
      outDir: join(outDir, 'extract'),
    })
    expect(Object.fromEntries(extracts.map((result) => [result.name, result.rows]))).toMatchObject({
      products: 30,
      categories: 39,
      makers: 11,
      customers: 4,
      orders: 3,
      wishlists: 4,
      subscribers: 4,
    })
    const products = read(join(outDir, 'extract', 'products.jsonl'))
    const product = (id: number) => products.find((row) => row.legacyId === id) ?? {}
    expect((product(1009).categoryIds as number[]).length).toBe(16)
    expect(product(1300).year).toBeNull()
    expect(product(1302).year).toBe('null')
    expect(product(1301).year).toBe('Leiden')
    expect(product(1044)).toMatchObject({
      sku: 'M.Dav5',
      size: '40 b7 22 cm.',
      price: null,
      priceOnRequest: true,
    })
    expect(product(1101).sku).toBe('M.1044')
    expect(product(1015).maker).toBeNull()
    expect(product(1950).soldAt).toBe('0000-00-00 00:00:00')
    expect(product(1009).price).toBe('38800.00') // text, never a float
    expect(product(2090).descriptionHtml).toContain('香料群島')
    expect(product(2090).descriptionHtml).toContain(
      'a quote \' a double quote " a backslash \\ and\na line',
    )

    const customers = read(join(outDir, 'extract', 'customers.jsonl'))
    for (const customer of customers) {
      expect(customer).not.toHaveProperty('password')
      expect(customer.email).toMatch(/@example\.invalid$/)
    }
    const urls = read(join(outDir, 'extract', 'urls.jsonl')).map((row) => row.path)
    expect(urls).toContain('/product/1009-indian-ocean-navigational-voc-sea-chart-year-1689')
    expect(urls).toContain('/storage/products/1044-3005.jpg')
    expect(urls).not.toContain('/product/1900-deleted-duplicate-listing')

    const tables = await dumpTables({ container, schema, outDir: join(outDir, 'tables') })
    expect(tables.find((result) => result.name === 'products')?.rows).toBe(30)
    const userRows = read(join(outDir, 'tables', 'users.jsonl'))
    expect(userRows[0]).not.toHaveProperty('password')
    expect(userRows[0]).not.toHaveProperty('remember_token')
  }, 300_000)
})
