// The JSONL state file both checks resume from (a rerun with the same `--state` skips a URL already
// answered). One line per finished URL: `{ url, outcome }`. Read leniently — a half-written last
// line (a run killed mid-append) is ignored, so a resumed run redoes only that URL.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

/** The default state path, one file per site, under the OS temp dir. */
export function defaultStatePath(site, name) {
  return join(tmpdir(), `phase9-${name}-${site}.jsonl`)
}

/** Reads the answers already recorded: a Map from URL to its outcome object. */
export function readState(path) {
  const done = new Map()
  if (!path || !existsSync(path)) return done
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const text = line.trim()
    if (text === '') continue
    let record
    try {
      record = JSON.parse(text)
    } catch {
      continue // a truncated final line from a killed run
    }
    if (record && typeof record.url === 'string') done.set(record.url, record.outcome)
  }
  return done
}

/** A state writer that mkdirs the parent once and appends one JSON line per answer. */
export function createStateWriter(path) {
  if (!path) return () => {}
  mkdirSync(dirname(path), { recursive: true })
  return (url, outcome) => {
    appendFileSync(path, `${JSON.stringify({ url, outcome })}\n`)
  }
}
