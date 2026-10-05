/**
 * Where the admin roles drive leaves its evidence (TASKS.md 3.6.d): screenshots and one JSON file
 * of what it read — counts, messages, timings — under `docs/gates/3.6/`, which the gate's
 * write-up (`docs/gates/3.6.md`) quotes. A re-run overwrites them with its own.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

/** Records `value` under `key` and rewrites the drive's JSON. */
export function record(key: string, value: unknown): void {
  read[key] = value
  mkdirSync(DIR, { recursive: true })
  writeFileSync(FILE, `${JSON.stringify(read, null, 2)}\n`)
}
