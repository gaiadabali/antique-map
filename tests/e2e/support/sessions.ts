/**
 * Staff sessions, signed in once and reused by the specs — across runs too.
 *
 * Why: `POST /api/users/login` is limited to 10 per address per 15 minutes (SECURITY.md §2.10,
 * `security/rate-limit.ts`), and every Playwright worker is the same address. A suite where each
 * spec, each worker and each browser sign-in logs in on its own trips the limiter (the 429s in CI
 * run 37819584451); so did two whole runs back to back against one server, each signing the four
 * accounts in again (TASKS.md 27.7). The limiter stays as it is. The global setup keeps each
 * account's token while the server still accepts it (`/api/users/me`) and signs in only the ones it
 * no longer does — after a restart, whose fresh `PAYLOAD_SECRET` ends them all, or a spec that
 * signed an account out. A spec that tests the limiter itself, or the sign-in form, still signs in
 * for real: it just does not call `savedToken`.
 *
 * The tokens live in `.cache/e2e/sessions-<port>.json` (git-ignored, outside `test-results/`, which
 * Playwright empties before each run): one file per server port, so two worktrees' servers keep
 * theirs apart. A missing file or account is `null`, and the caller signs in the long way.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { localPort } from '../admin/local.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

export const SESSIONS_FILE = join(root, '.cache', 'e2e', `sessions-${localPort()}.json`)

type Sessions = Record<string, string>

export function readSessions(): Sessions {
  if (!existsSync(SESSIONS_FILE)) return {}
  try {
    return JSON.parse(readFileSync(SESSIONS_FILE, 'utf8')) as Sessions
  } catch {
    return {}
  }
}

/** The JWT the global setup checked (or a spec saved) for this account's email, or null. */
export function savedToken(email: string): string | null {
  return readSessions()[email] ?? null
}

export function saveTokens(tokens: Sessions): void {
  mkdirSync(dirname(SESSIONS_FILE), { recursive: true })
  writeFileSync(SESSIONS_FILE, JSON.stringify({ ...readSessions(), ...tokens }))
}

/** Forgets accounts whose tokens the server no longer accepts. */
export function forgetTokens(emails: readonly string[]): void {
  const kept = readSessions()
  for (const email of emails) delete kept[email]
  mkdirSync(dirname(SESSIONS_FILE), { recursive: true })
  writeFileSync(SESSIONS_FILE, JSON.stringify(kept))
}
