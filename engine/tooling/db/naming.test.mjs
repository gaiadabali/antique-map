import { describe, expect, it } from 'vitest'

import {
  APPS,
  ArgError,
  databaseName,
  parseApp,
  parseDatabaseName,
  parseSuffix,
} from './naming.mjs'

describe('parseSuffix', () => {
  it('accepts a worktree-style suffix', () => {
    expect(parseSuffix('p2_har_inf')).toBe('p2_har_inf')
    expect(parseSuffix('smoke')).toBe('smoke')
  })

  it('rejects empty, upper-case, dashed or over-long values', () => {
    expect(() => parseSuffix('')).toThrow(ArgError)
    expect(() => parseSuffix(undefined)).toThrow(ArgError)
    expect(() => parseSuffix('P2-HAR')).toThrow(ArgError)
    expect(() => parseSuffix('a'.repeat(41))).toThrow(ArgError)
  })

  it("rejects a suffix that would read as another app's database", () => {
    expect(() => parseSuffix('shop_p2')).toThrow(ArgError)
    expect(() => parseSuffix('gallery')).toThrow(ArgError)
    expect(parseSuffix('shopfront')).toBe('shopfront')
  })
})

describe('parseApp', () => {
  it('is gallery by default, web its alias, shop the other', () => {
    expect(parseApp(undefined)).toBe('gallery')
    expect(parseApp('web')).toBe('gallery')
    expect(parseApp('Shop')).toBe('shop')
    expect(() => parseApp('admin')).toThrow(ArgError)
  })

  it('names the CMS that migrates each app', () => {
    expect(APPS.gallery.cms).toBe('@engine/cms')
    expect(APPS.shop.cms).toBe('@engine/cms-shop')
  })
})

describe('databaseName — one database per app per worktree', () => {
  it('is indies_<suffix> for today’s app, indies_shop_<suffix> for the shop', () => {
    expect(databaseName('plt')).toBe('indies_plt')
    expect(databaseName('ci', 'gallery')).toBe('indies_ci')
    expect(databaseName('ci', 'shop')).toBe('indies_shop_ci')
  })

  it('gives two lanes, and one lane’s two apps, distinct names', () => {
    expect(databaseName('p2_zza')).not.toBe(databaseName('p2_zzb'))
    expect(databaseName('p2_zza', 'shop')).not.toBe(databaseName('p2_zza', 'gallery'))
  })

  it('rejects a name over the 63-byte Postgres identifier limit', () => {
    expect(() => databaseName('a'.repeat(60))).toThrow(ArgError)
    expect(() => databaseName('a'.repeat(52), 'shop')).toThrow(ArgError)
  })
})

describe('parseDatabaseName', () => {
  it('recovers the app and suffix a valid name was built from', () => {
    expect(parseDatabaseName('indies_p2_plt')).toEqual({ app: 'gallery', suffix: 'p2_plt' })
    expect(parseDatabaseName(databaseName('ci', 'shop'))).toEqual({ app: 'shop', suffix: 'ci' })
  })

  it('returns null for another database, or the bare prefix', () => {
    expect(parseDatabaseName('postgres')).toBeNull()
    expect(parseDatabaseName('indies_gallery-x')).toBeNull()
    expect(parseDatabaseName('indies_gallery_x')).toBeNull()
    expect(parseDatabaseName('indies_')).toBeNull()
    expect(parseDatabaseName('indies_shop_')).toBeNull()
    expect(parseDatabaseName('ig_db')).toBeNull()
  })
})
