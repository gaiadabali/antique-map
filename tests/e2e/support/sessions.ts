/**
 * Staff sessions, signed in once per run (`global-setup.ts`) and read by the specs.
 *
 * Why: `POST /api/users/login` is limited to 10 per address per 15 minutes (SECURITY.md §2.10,
 * `security/rate-limit.ts`), and every Playwright worker is the same address. A suite where each
 * spec, each worker and each browser sign-in logs in on its own trips the limiter (the 429s in CI
 * run 37819584451). The limiter stays as it is; the suite logs each account in once and every
 * spec reuses that token. A spec that tests the limiter itself, or the sign-in form, still signs
 * in for real: it just does not call `savedToken`.
 *
 * The tokens live in `test-results/.sessions.json` (Playwright empties it before the run starts,
 * and it is git-ignored), written by the global setup, read by any worker. A missing file or
 * account is `null`, and the caller signs in the long way.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

export const SESSIONS_FILE = join(root, 'test-results', '.sessions.json')

type Sessions = Record<string, string>

function read(): Sessions {
  if (!existsSync(SESSIONS_FILE)) return {}
  try {
    return JSON.parse(readFileSync(SESSIONS_FILE, 'utf8')) as Sessions
  } catch {
    return {}
  }
}

/** The JWT the global setup saved for this account's email, or null. */
export function savedToken(email: string): string | null {
  return read()[email] ?? null
}

export function saveTokens(tokens: Sessions): void {
  mkdirSync(dirname(SESSIONS_FILE), { recursive: true })
  writeFileSync(SESSIONS_FILE, JSON.stringify({ ...read(), ...tokens }))
}
