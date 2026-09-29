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
    expect(parseBrandSlug('fixture-atlas')).toBe('fixture-atlas')
    expect(parseBrandSlug('test')).toBe('test')
  })

  it('rejects an empty, upper-case or symbol-bearing value', () => {
    expect(() => parseBrandSlug('')).toThrow(ArgError)
    expect(() => parseBrandSlug('Fixture-Atlas')).toThrow(ArgError)
    expect(() => parseBrandSlug('fixture_atlas')).toThrow(ArgError)
    expect(() => parseBrandSlug('fixture atlas')).toThrow(ArgError)
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
    expect(databaseName('fixture-atlas', 'p2_har_inf')).toBe('fixture_atlas_p2_har_inf')
    expect(databaseName('test', 'smoke')).toBe('test_smoke')
  })

  it('gives two lanes on the same brand distinct names', () => {
    expect(databaseName('test', 'p2_zza')).not.toBe(databaseName('test', 'p2_zzb'))
  })

  it('gives two brands on the same suffix distinct names', () => {
    expect(databaseName('fixture-atlas', 'smoke')).not.toBe(
      databaseName('fixture-emporium', 'smoke'),
    )
  })

  it('rejects a combination over the 63-byte Postgres identifier limit', () => {
    expect(() => databaseName('fixture-emporium', 'a'.repeat(50))).toThrow(ArgError)
  })
})

describe('parseDatabaseName', () => {
  const brands = ['fixture-atlas', 'fixture-emporium', 'test']

  it('recovers the (brand, suffix) pair a valid name was built from', () => {
    expect(parseDatabaseName('test_smoke', brands)).toEqual({ brand: 'test', suffix: 'smoke' })
    expect(parseDatabaseName('fixture_atlas_p2_har', brands)).toEqual({
      brand: 'fixture-atlas',
      suffix: 'p2_har',
    })
  })

  it('prefers the longer brand prefix when one brand slug prefixes another', () => {
    // A hypothetical "old" brand must not shadow "fixture-emporium" just
    // because it is checked first — order in `brands` must not matter.
    const ambiguous = ['old', 'fixture-emporium']
    expect(parseDatabaseName('fixture_emporium_x', ambiguous)).toEqual({
      brand: 'fixture-emporium',
      suffix: 'x',
    })
    expect(parseDatabaseName('fixture_emporium_x', [...ambiguous].reverse())).toEqual({
      brand: 'fixture-emporium',
      suffix: 'x',
    })
  })

  it('returns null for a name with no matching brand prefix, or a bare brand name', () => {
    expect(parseDatabaseName('postgres', brands)).toBeNull()
    expect(parseDatabaseName('unrelated_db', brands)).toBeNull()
    expect(parseDatabaseName('test', brands)).toBeNull()
  })
})
