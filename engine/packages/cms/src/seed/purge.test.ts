/**
 * The purge (DATA.md §2): refuses production outright, and agrees with the seed about what seed
 * data is — the keys of the seed's own committed shop sheets.
 */
import { describe, expect, it } from 'vitest'

import { purgeRefusal, seedShopKeys } from './purge'

describe('purgeRefusal', () => {
  it('refuses production (fail closed, as the db adapter does)', () => {
    expect(purgeRefusal({ NODE_ENV: 'production' })).toMatch(/refused in production/)
    expect(purgeRefusal({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x' })).toMatch(
      /refused in production/,
    )
  })

  it('allows everywhere else: no NODE_ENV, development, staging', () => {
    expect(purgeRefusal({})).toBeNull()
    expect(purgeRefusal({ NODE_ENV: 'development' })).toBeNull()
    expect(purgeRefusal({ NODE_ENV: 'staging' })).toBeNull()
  })
})

describe('seedShopKeys', () => {
  const keys = seedShopKeys()

  it('reads the committed shop sheets: SEED- products and stores', () => {
    expect(keys.skus.length).toBeGreaterThan(0)
    for (const sku of keys.skus) expect(sku.startsWith('SEED-')).toBe(true)
    expect(keys.storeCodes.length).toBeGreaterThan(0)
    // The welcome discount is not seed data — it is never in the purge's keys.
    expect(Object.keys(keys)).toEqual(['skus', 'storeCodes'])
  })

  it('is deterministic — the same keys twice', () => {
    expect(seedShopKeys()).toEqual(keys)
  })
})