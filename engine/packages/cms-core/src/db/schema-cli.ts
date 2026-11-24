/**
 * What a CMS's schema scripts share (`./schema-scripts`: `migrate:create`, `schema:check`): the
 * CMS's config as those scripts run it, the migration folder's latest snapshot, and a clean exit
 * code. Run through `payload run`, which loads TypeScript and the nearest `.env*` file, and which
 * would otherwise exit 0 whatever happened. The Payload instance itself is made by the CMS's own
 * CLI module (`getPayload(…SCHEMA_INSTANCE…)`): only a CMS's instance, its CLI and tests call
 * `getPayload(` (`@engine/cms`'s `instance.test`).
 *
 * Generating or diffing schema reads no secret and, unless asked to, opens no connection; the
 * placeholder secret below exists only because Payload refuses to initialise without one.
 */
import fs from 'node:fs'
import path from 'node:path'

import type { Payload, SanitizedConfig } from 'payload'

/** What a CMS's `payload.config` module default-exports: the built config, or its promise. */
export type ConfigModule = { default: SanitizedConfig | Promise<SanitizedConfig> }

/** How a schema script's instance starts: no `onInit`, and a connection only when asked. */
export const schemaInstance = (options: { connect: boolean }) =>
  ({ disableDBConnect: !options.connect, disableOnInit: true }) as const

/**
 * The config `load()` imports — the CMS's own `payload.config`, imported only once the environment
 * below is set — with its logs on stderr.
 */
export async function schemaConfig(load: () => Promise<ConfigModule>): Promise<SanitizedConfig> {
  process.env.PAYLOAD_MIGRATING = 'true'
  process.env.DISABLE_PAYLOAD_HMR = 'true'
  process.env.PAYLOAD_SECRET ||= 'schema-generation-only-never-signs-anything'
  const { default: configPromise } = await load()
  // stdout carries results (`schema:check print` is diffed byte for byte); logs go to stderr.
  const logger = { options: {}, destination: process.stderr }
  return {
    ...(await configPromise),
    logger: logger as unknown as SanitizedConfig['logger'],
  }
}

/** The snapshot `payload migrate:create` wrote last, or `null` before the first migration. */
export function latestSnapshot(migrationDir: string): { file: string; json: unknown } | null {
  if (!fs.existsSync(migrationDir)) return null
  const latest = fs
    .readdirSync(migrationDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .at(-1)
  if (!latest) return null
  const file = path.join(migrationDir, latest)
  return { file, json: JSON.parse(fs.readFileSync(file, 'utf8')) }
}

/** Ends the process with `code` once Payload's pool is closed. */
export async function finish(payload: Payload | undefined, code: number): Promise<never> {
  try {
    await payload?.destroy()
  } finally {
    process.exit(code)
  }
}

/**
 * A bare word after the script's path. `payload run` rebuilds `process.argv` from positional
 * arguments only and drops every `--flag`, so the scripts take words (`database`, `print`).
 */
export function argument(word: string): boolean {
  return process.argv.slice(2).includes(word)
}
