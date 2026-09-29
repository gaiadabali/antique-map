import { afterAll, describe, expect, it } from 'vitest'

import { psql } from '../db/psql.mjs'
import { compareSchemas, hashDatabase, normalizeSchema } from './schema-hash.mjs'

describe('normalizeSchema', () => {
  it('strips comment lines and blank-line noise, keeping DDL order', () => {
    const raw = [
      '--',
      '-- PostgreSQL database dump',
      '--',
      '-- Dumped from database version 18.0',
      '',
      'CREATE TABLE public.foo (',
      '    id integer NOT NULL',
      ');',
      '',
      '',
      'CREATE TABLE public.bar (id integer);',
    ].join('\n')
    expect(normalizeSchema(raw)).toBe(
      [
        'CREATE TABLE public.foo (',
        '    id integer NOT NULL',
        ');',
        'CREATE TABLE public.bar (id integer);',
      ].join('\n'),
    )
  })
})

// Requires the local stack (`docker compose -f docker-compose.dev.yml up -d`).
// Skips instead of failing when Docker/Postgres is unreachable, so `pnpm
// test` stays green on a machine with no stack — the CI e2e job (2.3) always
// has one.
const stackUp = (() => {
  try {
    psql('postgres', 'SELECT 1')
    return true
  } catch {
    return false
  }
})()

describe.skipIf(!stackUp)(
  'schema-hash against the real stack — the planted violation (2.2.i)',
  () => {
    const dbA = 'schema_hash_fixture_a'
    const dbB = 'schema_hash_fixture_b'

    afterAll(() => {
      for (const db of [dbA, dbB]) {
        try {
          psql('postgres', `DROP DATABASE IF EXISTS "${db}"`)
        } catch {
          // best-effort cleanup
        }
      }
    })

    it('hashes two identical schemas equal, then drifted, then equal again', () => {
      for (const db of [dbA, dbB]) {
        psql('postgres', `DROP DATABASE IF EXISTS "${db}"`)
        psql('postgres', `CREATE DATABASE "${db}"`)
        psql(db, 'CREATE TABLE t (id integer PRIMARY KEY, label text)')
      }

      const before = compareSchemas([dbA, dbB])
      expect(before.allEqual).toBe(true)
      expect(before.hashes[0].hash).toBe(before.hashes[1].hash)

      // Plant the violation: hand-edit one brand's database directly, which
      // BRANDS.md §6 forbids ("zero manual DDL on a brand database, ever").
      psql(dbB, 'ALTER TABLE t ADD COLUMN extra text')
      const drifted = compareSchemas([dbA, dbB])
      expect(drifted.allEqual).toBe(false)

      // Remove it: the schemas converge again.
      psql(dbB, 'ALTER TABLE t DROP COLUMN extra')
      const after = compareSchemas([dbA, dbB])
      expect(after.allEqual).toBe(true)
    }, 20000)

    it('reports "nothing to compare" for a single database', () => {
      const { nothingToCompare } = compareSchemas([dbA])
      expect(nothingToCompare).toBe(true)
    })

    it('hashDatabase is stable across two dumps of the same schema', () => {
      const first = hashDatabase(dbA)
      const second = hashDatabase(dbA)
      expect(first.hash).toBe(second.hash)
    })
  },
)
