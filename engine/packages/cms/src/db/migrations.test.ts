import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ADMINS_LOCK_KEY } from '../collections/users/guards'
import { migrations } from '../migrations'
import { advisoryLockKey } from './advisory-lock'
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

  describe('the last-owner backstop (2.4 review)', () => {
    const text = source(migrations[0]!.name)
    /** Each constraint trigger the migration writes: its event, timing and condition. */
    const triggers = [
      ...text.matchAll(
        /CREATE CONSTRAINT TRIGGER "(\w+)"\s+AFTER (INSERT|UPDATE OF "role"|DELETE) ON "public"\."users"\s+(DEFERRABLE INITIALLY \w+|NOT DEFERRABLE)\s+FOR EACH ROW\s+WHEN \((.+)\)\s+EXECUTE FUNCTION "public"\."users_keep_an_owner"\(\);/g,
      ),
    ].map(([, name, event, timing, when]) => ({ name, event, timing, when }))

    it('judges every change that can lose the last owner: insert, update of role, delete', () => {
      expect(triggers).toEqual([
        {
          name: 'users_keep_an_owner_on_insert',
          event: 'INSERT',
          timing: 'DEFERRABLE INITIALLY IMMEDIATE',
          when: `NEW."role" IS DISTINCT FROM 'owner'`,
        },
        {
          name: 'users_keep_an_owner_on_update',
          event: 'UPDATE OF "role"',
          timing: 'DEFERRABLE INITIALLY IMMEDIATE',
          // Only a real loss of the owner role — never a sign-in's lockout-counter update.
          when: `OLD."role" = 'owner' AND NEW."role" IS DISTINCT FROM 'owner'`,
        },
        {
          name: 'users_keep_an_owner_on_delete',
          event: 'DELETE',
          timing: 'DEFERRABLE INITIALLY IMMEDIATE',
          when: `OLD."role" = 'owner'`,
        },
      ])
    })

    it('fires at the end of each statement, so a refusal reaches the caller (never at COMMIT)', () => {
      // Payload's commitTransaction swallows a failed COMMIT: a deferred refusal answered success.
      expect(text).not.toMatch(/INITIALLY DEFERRED/)
    })

    it('takes the lock the hooks take, computed from its name', () => {
      // The trigger and the hooks serialise on one key; if they drifted, two writers could race.
      const key = advisoryLockKey('engine/users/admins')
      expect(key).toBe('-9011197146015594413')
      expect(ADMINS_LOCK_KEY).toBe(key)
      expect(text).toContain(`PERFORM pg_catalog.pg_advisory_xact_lock(${key});`)
      expect(text.match(/pg_advisory_xact_lock\((-?\d+)\)/g)).toEqual([
        `pg_advisory_xact_lock(${key})`,
      ])
    })

    it('refuses to judge outside READ COMMITTED, where the lock would not serialise', () => {
      const body = text.slice(
        text.indexOf('$keep_an_owner$\n'),
        text.lastIndexOf('$keep_an_owner$'),
      )
      const isolation = body.indexOf(
        "IF current_setting('transaction_isolation') <> 'read committed' THEN",
      )
      expect(isolation).toBeGreaterThan(-1)
      expect(isolation).toBeLessThan(body.indexOf('pg_advisory_xact_lock'))
      expect(body).toContain(`SELECT 1 FROM "public"."users" WHERE "role" = 'owner'`)
    })

    it('pins search_path on every hand-written function', () => {
      const functions = [...text.matchAll(/CREATE FUNCTION "public"\."(\w+)"\(\)[^$]*/g)]
      expect(functions.map(([, name]) => name)).toEqual([
        'users_keep_an_owner',
        'users_refuse_truncate',
      ])
      for (const [declaration] of functions) {
        expect(declaration).toContain('SET search_path = pg_catalog, public')
      }
    })

    it('refuses TRUNCATE of users and of stores, statement by statement (R2)', () => {
      for (const table of ['users', 'stores']) {
        expect(text).toMatch(
          new RegExp(
            `CREATE TRIGGER "${table}_no_truncate"\\s+BEFORE TRUNCATE ON "public"\\."${table}"\\s+FOR EACH STATEMENT\\s+EXECUTE FUNCTION "public"\\."users_refuse_truncate"\\(\\);`,
          ),
        )
      }
    })

    it('is dropped by down(), triggers with their functions', () => {
      const down = text.slice(text.indexOf('export async function down('))
      expect(down).toContain('DROP FUNCTION IF EXISTS "public"."users_keep_an_owner"() CASCADE')
      expect(down).toContain('DROP FUNCTION IF EXISTS "public"."users_refuse_truncate"() CASCADE')
    })
  })

  it('carries no trace of the brand-era schema the reset dropped', () => {
    const full = source(migrations[0]!.name)
    // The code only: the header comment names what was left behind, and why.
    const text = full.slice(full.indexOf('export async function up('))
    for (const gone of ['users_roles', 'idempotency_keys', "'nl'", "'admin'"]) {
      expect(text).not.toContain(gone)
    }
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
