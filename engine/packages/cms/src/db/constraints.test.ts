/**
 * The constraint seam without a database: each collection's `custom.dbConstraints` lands on the
 * named table as drizzle CHECK and unique constraints, and anything it cannot place — a missing
 * table or column, a name two collections share, a name Postgres would truncate — fails loudly.
 * The pushed-database proofs are the collections' own `*.db.test.ts`.
 */
import {
  getTableConfig,
  integer,
  pgTable,
  text,
  type PgTable,
} from '@payloadcms/db-postgres/drizzle/pg-core'
import { describe, expect, it } from 'vitest'

import {
  collectConstraints,
  DB_CONSTRAINTS,
  dbConstraints,
  declareConstraints,
  type ConstraintSet,
} from './constraints'

const stockSet: ConstraintSet = {
  table: 'stock_levels',
  checks: { stock_levels_quantity_non_negative: 'quantity >= 0' },
  unique: {
    stock_levels_store_product_variant_unique: {
      columns: ['store_id', 'product_id', 'variant_sku'],
      nullsNotDistinct: true,
    },
  },
}

const stockColumns = () => ({
  id: integer('id'),
  store: integer('store_id'),
  product: integer('product_id'),
  variantSku: text('variant_sku'),
  quantity: integer('quantity'),
})

type Extension = { table: PgTable; extraConfig: (columns: Record<string, unknown>) => object }

/**
 * Runs the hook with a recording `extendTable`, then rebuilds each extended table with the extra
 * config it was handed — what Payload's own `extendDrizzleTable` merges into the live table.
 */
async function run(collections: unknown[], tables: Record<string, Record<string, unknown>>) {
  const extensions: Extension[] = []
  const built = Object.fromEntries(
    Object.entries(tables).map(([name, columns]) => [name, pgTable(name, columns as never)]),
  )
  await declareConstraints({
    adapter: { payload: { config: { collections } } },
    extendTable: (extension: Extension) => extensions.push(extension),
    schema: { enums: {}, relations: {}, tables: built },
  } as never)
  return extensions.map(({ table, extraConfig }) => {
    const name = getTableConfig(table).name
    return pgTable(name, tables[name] as never, (columns) => extraConfig(columns) as never)
  })
}

describe('the constraint seam', () => {
  it('puts a collection’s checks and unique keys on the table it names', async () => {
    const [table] = await run([{ slug: 'stock-levels', custom: dbConstraints(stockSet) }], {
      stock_levels: stockColumns(),
    })
    const config = getTableConfig(table!)
    expect(config.checks.map((c) => c.name)).toEqual(['stock_levels_quantity_non_negative'])
    expect(config.uniqueConstraints).toHaveLength(1)
    const [key] = config.uniqueConstraints
    expect(key!.name).toBe('stock_levels_store_product_variant_unique')
    expect(key!.columns.map((c) => c.name)).toEqual(['store_id', 'product_id', 'variant_sku'])
    expect(key!.nullsNotDistinct).toBe(true)
  })

  it('leaves collections without constraints alone', async () => {
    const extended = await run([{ slug: 'works' }, { slug: 'users', custom: { other: 1 } }], {
      stock_levels: stockColumns(),
    })
    expect(extended).toEqual([])
  })

  it('refuses a set naming a table the schema lacks', async () => {
    await expect(
      run([{ slug: 'stock-levels', custom: dbConstraints(stockSet) }], {}),
    ).rejects.toThrow(/table "stock_levels", which the schema lacks/)
  })

  it('refuses a unique key over a column the table lacks, when the schema is read', async () => {
    const [table] = await run([{ slug: 'stock-levels', custom: dbConstraints(stockSet) }], {
      stock_levels: { id: integer('id') },
    })
    expect(() => getTableConfig(table!)).toThrow(/has no column "store_id"/)
  })

  it('refuses a constraint name two collections both declare', () => {
    expect(() =>
      collectConstraints([
        { slug: 'a', custom: dbConstraints({ table: 't', checks: { same_name: 'true' } }) },
        { slug: 'b', custom: dbConstraints({ table: 'u', checks: { same_name: 'true' } }) },
      ]),
    ).toThrow(/declared by both "a" and "b"/)
  })

  it('refuses a name Postgres would fold or truncate, and a block that is not a list', () => {
    const named = (name: string) => [
      { slug: 'a', custom: dbConstraints({ table: 't', checks: { [name]: 'true' } }) },
    ]
    expect(() => collectConstraints(named('Bad'))).toThrow(/lower-case Postgres identifier/)
    expect(() => collectConstraints(named('x'.repeat(64)))).toThrow(/at most 63 bytes/)
    expect(() => collectConstraints([{ slug: 'a', custom: { [DB_CONSTRAINTS]: 'nope' } }])).toThrow(
      /not a list/,
    )
  })
})
