/**
 * Where `store-panel.spec.ts` leaves its evidence (TASKS.md 7.2): screenshots and timings under
 * `docs/gates/7.2/`, its own — phase 3's `docs/gates/3.6/` is closed, not this ticket's to touch.
 * Same shape as `./evidence.ts`; kept separate so a re-run of either never clobbers the other's.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { format, resolveConfig } from 'prettier'

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/gates/7.2')
const FILE = join(DIR, 'drive.json')
const read: Record<string, unknown> = existsSync(FILE)
  ? (JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, unknown>)
  : {}

/** The path of a screenshot named `name` (`.png` added). */
export function shot(name: string): string {
  mkdirSync(DIR, { recursive: true })
  return join(DIR, `${name}.png`)
}

/** Records `value` under `key` and rewrites the drive's JSON, keys sorted and Prettier-formatted. */
export async function record(key: string, value: unknown): Promise<void> {
  read[key] = value
  const sorted = Object.fromEntries(Object.entries(read).sort(([a], [b]) => a.localeCompare(b)))
  mkdirSync(DIR, { recursive: true })
  const options = (await resolveConfig(FILE)) ?? {}
  writeFileSync(FILE, await format(JSON.stringify(sorted), { ...options, filepath: FILE }))
}
