/**
 * The spike's fake "database": one JSON file per process port, so a cached read, a request-time
 * read and a Server Action in any route bundle of the process see the same state. It stands in for
 * what the domain will own — availability (C8), the bag (C6), a post's outcome (C13 `FORM_RESULT`).
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type Availability = 'available' | 'sold'

export type SpikeState = {
  readonly availability: Readonly<Record<string, Availability>>
  /** Bumped by an edit of the record, which is cached under `item:<id>`. */
  readonly edition: Readonly<Record<string, number>>
  /** Post outcomes by opaque id: never an entry the visitor typed, never personal data. */
  readonly results: Readonly<Record<string, { readonly text: string; readonly at: number }>>
}

const EMPTY: SpikeState = { availability: {}, edition: {}, results: {} }

function file(): string {
  return process.env.SPIKE_STORE ?? join(tmpdir(), `indies-spike-${process.env.PORT ?? 'dev'}.json`)
}

export function readState(): SpikeState {
  try {
    // A runtime path: tracing it would pull the whole project into the standalone output.
    const raw = readFileSync(/*turbopackIgnore: true*/ file(), 'utf8')
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<SpikeState>) }
  } catch {
    return EMPTY
  }
}

/** A kept outcome lives ten minutes (C13 `FORM_RESULT`); the file never holds more than this many. */
const RESULT_TTL_MS = 10 * 60 * 1000
const MAX_RESULTS = 200

/** Drops outcomes past their ten minutes, then the oldest beyond the cap (senior-fe #3). */
function pruned(results: SpikeState['results'], now: number): SpikeState['results'] {
  const live = Object.entries(results).filter(([, entry]) => now - entry.at <= RESULT_TTL_MS)
  live.sort(([, a], [, b]) => b.at - a.at)
  return Object.fromEntries(live.slice(0, MAX_RESULTS))
}

export function writeState(change: (state: SpikeState) => SpikeState): SpikeState {
  const changed = change(readState())
  const next = { ...changed, results: pruned(changed.results, Date.now()) }
  const target = file()
  writeFileSync(`${target}.tmp`, JSON.stringify(next))
  renameSync(`${target}.tmp`, target)
  return next
}
