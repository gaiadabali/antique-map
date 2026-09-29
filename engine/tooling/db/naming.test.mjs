import { describe, expect, it } from 'vitest'

import {
  ArgError,
  databaseName,
  parseBrandSlug,
  parseDatabaseName,
  parseSuffix,
} from './naming.mjs'

describe('parseBrandSlug', () => {
  it('accepts a kebab-case slug', () => {
    expect(parseBrandSlug('indies-gallery')).toBe('indies-gallery')
    expect(parseBrandSlug('test')).toBe('test')
  })

  it('rejects an empty, upper-case or symbol-bearing value', () => {
    expect(() => parseBrandSlug('')).toThrow(ArgError)
    expect(() => parseBrandSlug('Indies-Gallery')).toThrow(ArgError)
    expect(() => parseBrandSlug('indies_gallery')).toThrow(ArgError)
    expect(() => parseBrandSlug('indies gallery')).toThrow(ArgError)
    expect(() => parseBrandSlug(undefined)).toThrow(ArgError)
  })
})

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
})

describe('databaseName', () => {
  it('turns brand dashes into underscores and appends the suffix', () => {
    expect(databaseName('indies-gallery', 'p2_har_inf')).toBe('indies_gallery_p2_har_inf')
    expect(databaseName('test', 'smoke')).toBe('test_smoke')
  })

  it('gives two lanes on the same brand distinct names', () => {
    expect(databaseName('test', 'p2_zza')).not.toBe(databaseName('test', 'p2_zzb'))
  })

  it('gives two brands on the same suffix distinct names', () => {
    expect(databaseName('indies-gallery', 'smoke')).not.toBe(
      databaseName('old-east-indies', 'smoke'),
    )
  })

  it('rejects a combination over the 63-byte Postgres identifier limit', () => {
    expect(() => databaseName('old-east-indies', 'a'.repeat(50))).toThrow(ArgError)
  })
})

describe('parseDatabaseName', () => {
  const brands = ['indies-gallery', 'old-east-indies', 'test']

  it('recovers the (brand, suffix) pair a valid name was built from', () => {
    expect(parseDatabaseName('test_smoke', brands)).toEqual({ brand: 'test', suffix: 'smoke' })
    expect(parseDatabaseName('indies_gallery_p2_har', brands)).toEqual({
      brand: 'indies-gallery',
      suffix: 'p2_har',
    })
  })

  it('prefers the longer brand prefix when one brand slug prefixes another', () => {
    // A hypothetical "old" brand must not shadow "old-east-indies" just
    // because it is checked first — order in `brands` must not matter.
    const ambiguous = ['old', 'old-east-indies']
    expect(parseDatabaseName('old_east_indies_x', ambiguous)).toEqual({
      brand: 'old-east-indies',
      suffix: 'x',
    })
    expect(parseDatabaseName('old_east_indies_x', [...ambiguous].reverse())).toEqual({
      brand: 'old-east-indies',
      suffix: 'x',
    })
  })

  it('returns null for a name with no matching brand prefix, or a bare brand name', () => {
    expect(parseDatabaseName('postgres', brands)).toBeNull()
    expect(parseDatabaseName('unrelated_db', brands)).toBeNull()
    expect(parseDatabaseName('test', brands)).toBeNull()
  })
})
