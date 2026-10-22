// The mock dump (D42) covers every dirty-data case MIGRATION.md §4 lists, and
// holds nothing real: only invented people at example.invalid and no
// password hashes. Reading the fixture as text here is a coverage check on
// the fixture, never a way of extracting it — extraction is by SQL against
// the restored database (restore.integration.test.ts).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const dump = readFileSync(
  fileURLToPath(new URL('../fixtures/mock-dump.sql', import.meta.url)),
  'utf8',
)

function productRow(id: number): string {
  const start = dump.indexOf(`(${id},`, dump.indexOf('INSERT INTO `products`'))
  const end = dump.indexOf(',NULL),(', start)
  return dump.slice(start, end === -1 ? start + 2000 : end)
}

describe('the mock Laravel dump', () => {
  it('is a plain mysqldump: no CREATE DATABASE or USE, and the tables a Laravel catalogue has', () => {
    expect(dump).toMatch(/^-- MySQL dump 10\.13/)
    expect(dump).not.toMatch(/^CREATE DATABASE|^USE /m)
    const tables = [...dump.matchAll(/^CREATE TABLE `([a-z_]+)`/gm)].map((match) => match[1])
    expect(tables).toEqual(
      expect.arrayContaining([
        'migrations',
        'users',
        'categories',
        'mapmakers',
        'products',
        'product_images',
        'category_product',
        'orders',
        'order_items',
        'wishlists',
        'newsletter_subscribers',
      ]),
    )
  })

  it.each([
    ['Year: null (a NULL year)', 1300, /'Paris',NULL,'52 by 41 cm\.'/],
    ['Year: null (the text "null")', 1302, /'Amsterdam','null',/],
    ['Year: Leiden (a place in the year)', 1301, /'','Leiden','210 x 160 mm'/],
    ['40 b7 22 cm. (a typo for "by")', 1044, /'40 b7 22 cm\.'/],
    ['millimetres', 1009, /'450 x 380 mm'/],
    ['"x" without spaces and no full stop', 1015, /'23x17cm'/],
    ['an empty colour', 1009, /'450 x 380 mm','',/],
    ['a NULL colour', 1015, /'23x17cm',NULL,/],
    ['a missing maker', 1015, /^\(1015,NULL,/],
    ['freehand condition "Study images"', 1101, /'G\+ \/ Study images carefully'/],
    ['freehand condition "Study image"', 1044, /'G\+ \/ Study image carefully'/],
    ['SKU M.1044', 1101, /'M\.1044'/],
    ['SKU M.Dav5', 1044, /'M\.Dav5'/],
    ['"On Request" (NULL price, flag set)', 1044, /NULL,1,'listed'/],
    ['"On Request" (a zero price, flag set)', 1850, /0\.00,1,'listed'/],
    ['an SEO suffix "- Year 1661"', 1001, /'Southeast Asia map - Year 1661'/],
    ['an SEO suffix "- Extremely rare map"', 1044, /- Extremely rare map'/],
    ['an inline "( Ref: … )"', 1044, /\( Ref: Tooley, R\.V\. \(Australia\) 1268\. \)/],
    ['a zero date', 1950, /'0000-00-00 00:00:00'/],
  ])('carries %s', (_case, id, pattern) => {
    expect(productRow(id)).toMatch(pattern)
  })

  it('tags one chart with 16 categories', () => {
    const pivot = dump.slice(dump.indexOf('INSERT INTO `category_product`'))
    const line = pivot.slice(0, pivot.indexOf(';\n'))
    expect([...line.matchAll(/\(\d+,1009\)/g)]).toHaveLength(16)
  })

  it('writes no inches anywhere', () => {
    expect(dump).not.toMatch(/\d\s*(?:in\.|inch|")/i)
  })

  it('holds no real person: every address at example.invalid, no password hash', () => {
    const addresses = [...dump.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g)].map(
      (match) => match[0],
    )
    expect(addresses.length).toBeGreaterThan(5)
    for (const address of addresses) expect(address).toMatch(/@example\.invalid$/)
    expect(dump).not.toMatch(/\$2[aby]\$\d\d\$/) // a bcrypt hash
    expect(dump).not.toMatch(/https?:\/\//) // no domain, the old store's least of all
  })
})
