/**
 * `pnpm --filter @engine/cms migrate:create <name>` — the SCH lead's one migration per wave
 * (PARALLEL-TRACKS.md §3.2), generated in a clean worktree with `BRAND` unset. Payload's own
 * `migrate:create`, plus three things it does not do:
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
 */
import fs from 'node:fs'
import path from 'node:path'

import * as prettier from 'prettier'

import { finish, schemaPayload } from './cli'
import { finishMigrationSource } from './migration-template'
import { pendingMigrationStatements } from './schema-diff'

const name = process.argv.slice(2).find((arg) => !arg.startsWith('-'))
const payload = await schemaPayload({ connect: false })
let code = 0
try {
  if (!name || !/^[a-z0-9_]+$/.test(name)) {
    throw new Error('name the migration after its wave, in snake_case: migrate:create wave_a')
  }
  const { statements, against } = await pendingMigrationStatements(payload)
  if (statements.length === 0) {
    console.log(
      `migrate:create: No schema changes detected (against ${against ?? 'no snapshot'}); nothing written`,
    )
  } else {
    const dir = payload.db.migrationDir
    const before = new Map(
      fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => [f, mtime(dir, f)]) : [],
    )
    await payload.db.createMigration({ migrationName: name, payload, forceAcceptWarning: true })
    const written = fs.readdirSync(dir).filter((file) => before.get(file) !== mtime(dir, file))
    for (const file of written) await finishFile(path.join(dir, file))
    console.log(`migrate:create: wrote ${written.sort().join(', ')}`)
  }
} catch (error) {
  code = 1
  console.error(`migrate:create: ${error instanceof Error ? error.message : String(error)}`)
}
await finish(payload, code)

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
