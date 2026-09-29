/**
 * The config's schema against what the migrations already carry, as drizzle-kit computes it for
 * `payload migrate:create` — without writing a file. Empty means "No schema changes detected"
 * (DEPLOYMENT.md §4.4): the committed snapshot chain still describes the config exactly.
 *
 * And, with a connection, a live database against the migration set: every bundled migration
 * applied, and none recorded that the code does not know (a database migrated by another branch).
 * Structural equality across the brands' databases is `schema-hash --all`'s (TASKS.md 2.2.c):
 * drizzle-kit's own database comparison — the one a dev push uses — fails on any database that
 * already has tables: its introspection sends parameterised queries through a path that drops the
 * parameters, and Postgres answers `42P02 there is no parameter $1` (KOI's finding, confirmed here
 * on drizzle-kit 0.31.7).
 */
import type { Payload } from 'payload'

import { migrations } from '../migrations'
import { latestSnapshot } from './cli'

type DrizzleKit = {
  generateDrizzleJson: (schema: Record<string, unknown>) => Promise<SnapshotJson> | SnapshotJson
  generateMigration: (before: SnapshotJson, after: SnapshotJson) => Promise<string[]>
  upSnapshot?: (snapshot: SnapshotJson) => SnapshotJson
}
type SnapshotJson = { version?: string; id?: string; prevId?: string } & Record<string, unknown>

type SchemaAdapter = {
  requireDrizzleKit: () => DrizzleKit
  schema: Record<string, unknown>
  migrationDir: string
  defaultDrizzleSnapshot: SnapshotJson
}

function adapterOf(payload: Payload): SchemaAdapter {
  return payload.db as unknown as SchemaAdapter
}

/** The config's schema as drizzle-kit's snapshot JSON. */
export async function currentSnapshot(payload: Payload): Promise<SnapshotJson> {
  const adapter = adapterOf(payload)
  return adapter.requireDrizzleKit().generateDrizzleJson(adapter.schema)
}

/** The same, with the random `id`/`prevId` removed — stable output to diff in CI (2.2.g). */
export function normalisedSnapshot(snapshot: SnapshotJson): Record<string, unknown> {
  const { id: _id, prevId: _prevId, ...rest } = snapshot
  return rest
}

/** SQL `migrate:create` would write now; `[]` when the migrations already carry the config. */
export async function pendingMigrationStatements(payload: Payload): Promise<{
  statements: string[]
  against: string | null
}> {
  const adapter = adapterOf(payload)
  const kit = adapter.requireDrizzleKit()
  const after = await currentSnapshot(payload)
  const latest = latestSnapshot(adapter.migrationDir)
  let before = (latest?.json as SnapshotJson | undefined) ?? adapter.defaultDrizzleSnapshot
  if (latest && kit.upSnapshot && String(before.version) < String(after.version)) {
    before = kit.upSnapshot(before)
  }
  return { statements: await kit.generateMigration(before, after), against: latest?.file ?? null }
}

/** What the connected database has applied, against the bundled set. Both empty: in step. */
export async function migrationDrift(
  payload: Payload,
): Promise<{ pending: string[]; unknown: string[] }> {
  const { docs } = await payload.find({
    collection: 'payload-migrations',
    limit: 0,
    pagination: false,
    overrideAccess: true,
  })
  const applied = new Set(
    docs.filter((doc) => Number(doc.batch) > 0).map((doc) => String(doc.name)),
  )
  const bundled = new Set(migrations.map((migration) => migration.name))
  return {
    pending: [...bundled].filter((name) => !applied.has(name)),
    unknown: [...applied].filter((name) => !bundled.has(name)),
  }
}
