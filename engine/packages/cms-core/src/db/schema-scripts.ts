/**
 * The bodies of a CMS's two schema scripts, each run through `payload run` by a two-line file in
 * that CMS (`src/db/generate-migration.ts`, `src/db/schema-check.ts`) that builds the Payload
 * instance from its own config (`./schema-cli` `schemaConfig`) and passes its migration set.
 *
 * **`migrate:create <name>`** (`createMigration`) — the schema lead's one migration per wave
 * (WORKFLOW.md §2), generated in a clean worktree. Payload's own `migrate:create`, plus what it
 * does not do:
 *
 * - it says "No schema changes detected" and writes nothing when there are none (Payload's
 *   `--skip-empty` exits silently, and without it asks on a terminal CI does not have);
 * - it never asks Payload's "create a blank migration?" question (a rename or a drop, which
 *   drizzle-kit still asks about, is not a wave migration's business: migrations are additive
 *   first, and a destructive step is written by hand in a later release — DEPLOYMENT.md §4.1);
 * - it imports the two argument types as types, and opens `up()` with a lock timeout
 *   (`./migration-template`);
 * - it formats what it wrote with the repository's Prettier, so `format:check` passes on the
 *   file exactly as generated and nobody edits a generated file to make it pass.
 *
 * **`schema:check`** (`checkSchema`, TASKS.md 3.2.c, DEPLOYMENT.md §4.4):
 *
 *   schema:check             the config against the latest committed snapshot: exit 1 and the
 *                            SQL if `migrate:create` would write a migration — someone changed a
 *                            collection without the wave's migration, or the chain drifted
 *   schema:check database    also the connected database (DATABASE_URL): exit 1 if a bundled
 *                            migration is not applied there, or it records one the code lacks
 *   schema:check print       print the normalised snapshot JSON and exit — stable output to
 *                            diff in CI
 *
 * Words, not `--flags`: `payload run` drops flags before the script sees them (`argument`).
 */
import fs from 'node:fs'
import path from 'node:path'

import type { Payload } from 'payload'
import * as prettier from 'prettier'

import type { BundledMigration } from './adapter'
import { finishMigrationSource } from './migration-template'
import { argument } from './schema-cli'
import {
  currentSnapshot,
  migrationDrift,
  normalisedSnapshot,
  pendingMigrationStatements,
} from './schema-diff'

/** `migrate:create <name>`: writes the wave's migration, or nothing. Returns the exit code. */
export async function createMigration(payload: Payload, name: string | undefined): Promise<number> {
  try {
    if (!name || !/^[a-z0-9_]+$/.test(name)) {
      throw new Error('name the migration after its wave, in snake_case: migrate:create wave_a')
    }
    const { statements, against } = await pendingMigrationStatements(payload)
    if (statements.length === 0) {
      console.log(
        `migrate:create: No schema changes detected (against ${against ?? 'no snapshot'}); nothing written`,
      )
      return 0
    }
    const dir = payload.db.migrationDir
    const before = new Map(
      fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => [f, mtime(dir, f)]) : [],
    )
    await payload.db.createMigration({ migrationName: name, payload, forceAcceptWarning: true })
    const written = fs.readdirSync(dir).filter((file) => before.get(file) !== mtime(dir, file))
    for (const file of written) await finishFile(path.join(dir, file))
    console.log(`migrate:create: wrote ${written.sort().join(', ')}`)
    return 0
  } catch (error) {
    console.error(`migrate:create: ${error instanceof Error ? error.message : String(error)}`)
    return 1
  }
}

/** The migration name after the script's path: the first word that is not a flag. */
export function migrationNameArgument(): string | undefined {
  return process.argv.slice(2).find((arg) => !arg.startsWith('-'))
}

function mtime(dir: string, file: string): number {
  return fs.statSync(path.join(dir, file)).mtimeMs
}

async function finishFile(file: string): Promise<void> {
  const options = await prettier.resolveConfig(file)
  const source = fs.readFileSync(file, 'utf8')
  const typed =
    file.endsWith('.ts') && !file.endsWith('index.ts') ? finishMigrationSource(source) : source
  fs.writeFileSync(file, await prettier.format(typed, { ...options, filepath: file }))
}

/** What `schema:check` was asked for: the words after the script's path. */
export function schemaCheckArguments(): { withDatabase: boolean; printing: boolean } {
  return { withDatabase: argument('database'), printing: argument('print') }
}

/** `schema:check [database | print]` against `migrations`, the CMS's bundled set. Exit code. */
export async function checkSchema(
  payload: Payload,
  options: {
    withDatabase: boolean
    printing: boolean
    migrations: readonly Pick<BundledMigration, 'name'>[]
  },
): Promise<number> {
  const { withDatabase, printing, migrations } = options
  let code = 0
  try {
    if (printing) {
      process.stdout.write(
        `${JSON.stringify(normalisedSnapshot(await currentSnapshot(payload)), null, 2)}\n`,
      )
      return 0
    }
    const { statements, against } = await pendingMigrationStatements(payload)
    if (statements.length === 0) {
      console.log(`schema:check: No schema changes detected (against ${against ?? 'no snapshot'})`)
    } else {
      code = 1
      console.error(
        `schema:check: the config differs from ${against ?? 'an empty database'} — the SCH lead's migrate:create would write:\n${statements.join('\n')}`,
      )
    }
    if (withDatabase) {
      const { pending, unknown } = await migrationDrift(payload, migrations)
      if (pending.length === 0 && unknown.length === 0) {
        console.log('schema:check: the database has applied every migration, and only those')
      } else {
        code = 1
        console.error(
          `schema:check: the database is out of step — pending: ${pending.join(', ') || 'none'}; unknown to this code: ${unknown.join(', ') || 'none'}`,
        )
      }
    }
  } catch (error) {
    code = 1
    console.error(`schema:check: ${error instanceof Error ? error.stack : String(error)}`)
  }
  return code
}
