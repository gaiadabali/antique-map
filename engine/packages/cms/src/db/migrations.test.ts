import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ADMINS_LOCK_KEY } from '../collections/users/guards'
import { migrations } from '../migrations'
import { finishMigrationSource, typeOnlyImports, withLockTimeout } from './migration-template'

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

  it('opens with the initial migration, which creates unaccent and pg_trgm in public before any table', () => {
    const [initial] = migrations
    expect(initial?.name).toMatch(/_initial$/)
    const text = source(initial!.name)
    const unaccent = text.indexOf('CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA public')
    const trigram = text.indexOf('CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA public')
    expect(unaccent).toBeGreaterThan(-1)
    expect(trigram).toBeGreaterThan(-1)
    expect(Math.max(unaccent, trigram)).toBeLessThan(text.indexOf('CREATE TABLE'))
  })

  it('imports the argument types as types, and opens every up() with a lock timeout', () => {
    for (const { name } of migrations) {
      const text = source(name)
      expect(text).not.toMatch(/import \{ MigrateUpArgs/)
      const up = text.indexOf('export async function up(')
      expect(text.indexOf("SET LOCAL lock_timeout = '5s'")).toBeGreaterThan(up)
      expect(text.indexOf("SET LOCAL lock_timeout = '5s'")).toBeLessThan(text.indexOf('CREATE'))
    }
  })

  it('carries the engine table: unique (operation, key), no primary key, a nullable response', () => {
    const text = source(migrations[0]!.name)
    const table = text.slice(text.indexOf('CREATE TABLE "idempotency_keys"'))
    const body = table.slice(0, table.indexOf(');'))
    expect(body).toContain(
      'CONSTRAINT "idempotency_keys_operation_key_unique" UNIQUE("operation","key")',
    )
    expect(body).not.toContain('PRIMARY KEY')
    expect(body).toContain('"operation" text COLLATE "C" NOT NULL')
    expect(body).toContain('"key" text COLLATE "C" NOT NULL')
    expect(body).toMatch(/"response" jsonb,/)
    expect(text).toContain('"idempotency_keys_created_at_idx"')
    expect(text).toContain(
      'CREATE INDEX "idempotency_keys_caller_ref_idx" ON "idempotency_keys" USING btree ("caller_ref") WHERE "caller_ref" IS NOT NULL',
    )
  })

  it('carries the last-admin trigger: deferred, on users_roles, under the hooks’ own lock', () => {
    const text = source(migrations[0]!.name)
    expect(text).toContain('CREATE CONSTRAINT TRIGGER "users_roles_keep_an_admin"')
    expect(text).toContain('AFTER UPDATE OR DELETE ON "users_roles"')
    expect(text).toContain('DEFERRABLE INITIALLY DEFERRED')
    // The trigger and the hooks serialise on one key; if they drifted, two commits could race.
    expect(text).toContain(`PERFORM pg_advisory_xact_lock(${ADMINS_LOCK_KEY});`)
    expect(text).toContain('DROP FUNCTION IF EXISTS "users_keep_an_admin"() CASCADE')
  })
})

describe('the migration template', () => {
  const generated = [
    "import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'",
    '',
    'export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {',
    '  await db.execute(sql`CREATE TABLE "x" ();`)',
    '}',
    '',
  ].join('\n')

  it('turns Payload’s value import of the argument types into a type import', () => {
    expect(typeOnlyImports(generated)).toContain(
      "import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'",
    )
    expect(typeOnlyImports('// nothing to change\n')).toBe('// nothing to change\n')
  })

  it('adds the lock timeout as up()’s first statement, once', () => {
    const once = finishMigrationSource(generated)
    expect(once).toContain(
      "Promise<void> {\n  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)\n  await db.execute(sql`CREATE TABLE",
    )
    expect(withLockTimeout(once)).toBe(once)
  })
})
