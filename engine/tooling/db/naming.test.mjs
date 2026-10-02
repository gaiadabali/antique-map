import { describe, expect, it } from 'vitest'

import { ArgError, databaseName, parseDatabaseName, parseSuffix } from './naming.mjs'

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

describe('databaseName — one database per worktree', () => {
  it('is indies_<suffix>', () => {
    expect(databaseName('plt')).toBe('indies_plt')
    expect(databaseName('ci')).toBe('indies_ci')
  })

  it('gives two lanes distinct names', () => {
    expect(databaseName('p2_zza')).not.toBe(databaseName('p2_zzb'))
  })

  it('rejects a name over the 63-byte Postgres identifier limit', () => {
    expect(() => databaseName('a'.repeat(60))).toThrow(ArgError)
  })
})

describe('parseDatabaseName', () => {
  it('recovers the suffix a valid name was built from', () => {
    expect(parseDatabaseName('indies_p2_plt')).toEqual({ suffix: 'p2_plt' })
    expect(parseDatabaseName(databaseName('ci'))).toEqual({ suffix: 'ci' })
  })

  it('returns null for another database, or the bare prefix', () => {
    expect(parseDatabaseName('postgres')).toBeNull()
    expect(parseDatabaseName('indies_gallery-x')).toBeNull()
    expect(parseDatabaseName('indies_')).toBeNull()
    expect(parseDatabaseName('ig_db')).toBeNull()
  })
})
