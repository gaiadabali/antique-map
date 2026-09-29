import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { migrations } from '../migrations'
import { typeOnlyImports } from './migration-template'

const migrationDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations')
const source = (name: string) => fs.readFileSync(path.join(migrationDir, `${name}.ts`), 'utf8')

describe('the migration set', () => {
  it('is bundled in name order, each with its snapshot beside it', () => {
    const names = migrations.map((migration) => migration.name)
    expect(names).toEqual([...names].sort())
    for (const name of names) {
      expect(fs.existsSync(path.join(migrationDir, `${name}.json`))).toBe(true)
    }
  })

  it('opens with the initial migration, which creates unaccent and pg_trgm before any table', () => {
    const [initial] = migrations
    expect(initial?.name).toMatch(/_initial$/)
    const text = source(initial!.name)
    const unaccent = text.indexOf('CREATE EXTENSION IF NOT EXISTS "unaccent"')
    const trigram = text.indexOf('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')
    expect(unaccent).toBeGreaterThan(-1)
    expect(trigram).toBeGreaterThan(-1)
    expect(Math.max(unaccent, trigram)).toBeLessThan(text.indexOf('CREATE TABLE'))
  })

  it('imports the migration argument types as types, in every file', () => {
    for (const { name } of migrations) {
      expect(source(name)).not.toMatch(/import \{ MigrateUpArgs/)
    }
  })

  it('carries the engine table and its indexes (the DDL seam)', () => {
    const text = source(migrations[0]!.name)
    expect(text).toContain('CREATE TABLE "idempotency_keys"')
    expect(text).toContain('PRIMARY KEY("operation","key")')
    expect(text).toContain('"idempotency_keys_created_at_idx"')
    expect(text).toContain('"idempotency_keys_caller_ref_idx"')
  })
})

describe('the migration template', () => {
  it('turns Payload’s value import of the argument types into a type import', () => {
    const generated =
      "import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'\n"
    expect(typeOnlyImports(generated)).toBe(
      "import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'\n",
    )
    expect(typeOnlyImports('// nothing to change\n')).toBe('// nothing to change\n')
  })
})
