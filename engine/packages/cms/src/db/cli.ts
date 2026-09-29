/**
 * What the two schema scripts share (`./generate-migration`, `./schema-check`): a Payload
 * instance built from the one config with **no brand**, the migration folder's latest snapshot,
 * and a clean exit code. Run through `payload run`, which loads TypeScript and the nearest
 * `.env*` file, and which would otherwise exit 0 whatever happened.
 *
 * Generating or diffing schema reads no secret and, unless asked to, opens no connection; the
 * placeholder secret below exists only because Payload refuses to initialise without one.
 */
import fs from 'node:fs'
import path from 'node:path'

import { getPayload, type Payload, type SanitizedConfig } from 'payload'

export async function schemaPayload(options: {
  connect: boolean
  /** Keep the caller's `BRAND` — only to prove the schema is the same with it (2.2.g). */
  keepBrand?: boolean
}): Promise<Payload> {
  // A migration is generated from the brand-independent config, whatever the shell has set
  // (ARCHITECTURE.md §2).
  if (!options.keepBrand) delete process.env.BRAND
  process.env.PAYLOAD_MIGRATING = 'true'
  process.env.DISABLE_PAYLOAD_HMR = 'true'
  process.env.PAYLOAD_SECRET ||= 'schema-generation-only-never-signs-anything'
  const { default: configPromise } = await import('../payload.config')
  // stdout carries results (`schema:check print` is diffed byte for byte); logs go to stderr.
  const logger = { options: {}, destination: process.stderr }
  const config = {
    ...(await configPromise),
    logger: logger as unknown as SanitizedConfig['logger'],
  }
  return getPayload({ config, disableDBConnect: !options.connect, disableOnInit: true })
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
