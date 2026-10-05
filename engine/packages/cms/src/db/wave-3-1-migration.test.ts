/**
 * Phase 3 wave 1's migration (TASKS.md 3.5.a), read as text: it carries every constraint the
 * constraint seam declares, the compound unique keys of pages and redirects, and its two
 * hand-written steps exactly — the payment ledger's append-only trigger as
 * `collections/payment-events/append-only.ts` writes it, and the order number's sequence. The
 * database proof is `./wave-3-1.db.test.ts`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  PAYMENT_EVENTS_APPEND_ONLY_DOWN_SQL,
  PAYMENT_EVENTS_APPEND_ONLY_SQL,
} from '../collections/payment-events/append-only'
import { migrations } from '../migrations'
import * as wave from '../migrations/20261002_200042_indies_wave_3_1'
import { registeredCollections } from '../registries/collections'
import { collectConstraints } from './constraints'

const NAME = '20261002_200042_indies_wave_3_1'
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations')
const text = fs.readFileSync(path.join(dir, `${NAME}.ts`), 'utf8')
const up = text.slice(
  text.indexOf('export async function up('),
  text.indexOf('export async function down('),
)
const down = text.slice(text.indexOf('export async function down('))

describe('phase 3 wave 1’s migration', () => {
  it('follows the initial directly', () => {
    expect(migrations.map((m) => m.name).slice(0, 2)).toEqual(['20261002_073156_initial', NAME])
  })

  it('adds every constraint the collections declare, and down() drops each', () => {
    const declared = collectConstraints(registeredCollections()).flatMap(({ set }) => [
      ...Object.keys(set.checks ?? {}),
      ...Object.keys(set.unique ?? {}),
    ])
    expect(declared).toHaveLength(20)
    for (const name of declared) {
      expect(up, name).toContain(`CONSTRAINT "${name}"`)
    }
    for (const name of ['users_store_staff_have_a_store', 'stores_pin_in_indonesia']) {
      expect(down, name).toContain(`DROP CONSTRAINT IF EXISTS "${name}"`)
    }
  })

  it('keeps one stock row per store, product and variant — a missing variant counted once', () => {
    expect(up).toContain(
      'CONSTRAINT "stock_levels_store_product_variant_unique" UNIQUE NULLS NOT DISTINCT("store_id","product_id","variant_sku")',
    )
  })

  it('makes a page’s slug unique per site, and a redirect’s from path', () => {
    expect(up).toContain(
      'CREATE UNIQUE INDEX "site_slug_idx" ON "pages" USING btree ("site","slug")',
    )
    expect(up).toContain(
      'CREATE UNIQUE INDEX "site_from_idx" ON "redirects" USING btree ("site","from")',
    )
  })

  it('drops the foreign keys into sources whether or not dropping the table took them', () => {
    // drizzle-kit drops `sources` CASCADE before it drops these by name.
    for (const fk of [
      'works_references_source_id_sources_id_fk',
      '_works_v_version_references_source_id_sources_id_fk',
      'payload_locked_documents_rels_sources_fk',
    ]) {
      expect(up).toContain(`DROP CONSTRAINT IF EXISTS "${fk}"`)
    }
    expect(down).not.toMatch(/DROP (CONSTRAINT|INDEX) "/)
  })

  it('writes the payment ledger’s append-only trigger exactly as the collection declares it', () => {
    expect(wave.PAYMENT_EVENTS_APPEND_ONLY_SQL).toBe(PAYMENT_EVENTS_APPEND_ONLY_SQL)
    expect(wave.PAYMENT_EVENTS_APPEND_ONLY_DOWN_SQL).toBe(PAYMENT_EVENTS_APPEND_ONLY_DOWN_SQL)
    expect(up).toContain('sql.raw(PAYMENT_EVENTS_APPEND_ONLY_SQL)')
    expect(down).toContain('sql.raw(PAYMENT_EVENTS_APPEND_ONLY_DOWN_SQL)')
  })

  it('numbers orders from a sequence starting at 100001, owned by the column', () => {
    expect(wave.ORDERS_NUMBER_SEQUENCE_SQL).toMatch(
      /CREATE SEQUENCE IF NOT EXISTS orders_number_seq AS bigint START WITH 100001 OWNED BY orders\.number;/,
    )
    expect(up).toContain('sql.raw(ORDERS_NUMBER_SEQUENCE_SQL)')
    expect(down).toContain('sql.raw(ORDERS_NUMBER_SEQUENCE_DOWN_SQL)')
  })

  it('runs the hand-written steps after the generated DDL, and undoes them before it', () => {
    expect(up.indexOf('sql.raw(PAYMENT_EVENTS_APPEND_ONLY_SQL)')).toBeGreaterThan(
      up.indexOf('CREATE TABLE "payment_events"'),
    )
    expect(up.indexOf('sql.raw(ORDERS_NUMBER_SEQUENCE_SQL)')).toBeGreaterThan(
      up.indexOf('CREATE TABLE "orders"'),
    )
    expect(down.indexOf('sql.raw(PAYMENT_EVENTS_APPEND_ONLY_DOWN_SQL)')).toBeLessThan(
      down.indexOf('DROP TABLE "payment_events"'),
    )
  })
})
