/**
 * Where the admin roles drive leaves its evidence (TASKS.md 3.6.d): screenshots and one JSON file
 * of what it read — counts, messages, timings — under `docs/gates/3.6/`, which the gate's
 * write-up (`docs/gates/3.6.md`) quotes. A re-run overwrites them with its own.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { format, resolveConfig } from 'prettier'

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/gates/3.6')
// Merged with what is there: each spec file may run in its own worker.
const FILE = join(DIR, 'drive.json')
const read: Record<string, unknown> = existsSync(FILE)
  ? (JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, unknown>)
  : {}

/** The path of a screenshot named `name` (`.png` added). */
export function shot(name: string): string {
  mkdirSync(DIR, { recursive: true })
  return join(DIR, `${name}.png`)
}

/**
 * Records `value` under `key` and rewrites the drive's JSON, keys sorted and formatted as the
 * repo's Prettier formats it — the file is committed, and `pnpm verify` checks its format.
 */
export async function record(key: string, value: unknown): Promise<void> {
  read[key] = value
  const sorted = Object.fromEntries(Object.entries(read).sort(([a], [b]) => a.localeCompare(b)))
  mkdirSync(DIR, { recursive: true })
  const options = (await resolveConfig(FILE)) ?? {}
  writeFileSync(FILE, await format(JSON.stringify(sorted), { ...options, filepath: FILE }))
}
