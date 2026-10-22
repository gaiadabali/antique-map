/**
 * The cookieless session id (ANALYTICS.md §2): collect derives it at request time — a SHA-256 of
 * a secret salt, the site, the client's address (nginx's `X-Forwarded-For`, SECURITY.md §2.10) and
 * its user agent. The salt is the process's secret (`ANALYTICS_SALT`) with the UTC day mixed in
 * and discarded the next day, so a session cannot be followed across days and nothing stored can
 * be reversed to an address. No cookie, no localStorage id, no fingerprint kept; neither the
 * address nor the user agent is stored — both are used for this hash, for bot filtering and for
 * `deviceClass`, then dropped. A process without the secret mixes in a per-process random seed
 * instead, so ids still do not survive a restart and still cannot be reversed.
 */
import { createHash, randomBytes } from 'node:crypto'

let processSeed: string | null = null

/** A key for the day: `YYYY-MM-DD` UTC — what the salt rotates on. */
export function dayKey(at: Date): string {
  return at.toISOString().slice(0, 10)
}

/** The day's salt: the secret (or the process seed) with the UTC day, hashed once. */
function saltFor(secret: string, day: string): string {
  return createHash('sha256').update(`${secret}|${day}`).digest('hex')
}

/**
 * The session id for one request: 64 hex characters, stable within the day and the browser
 * session, unlinkable across days. `address` may be empty (no `X-Forwarded-For`) — the hash then
 * covers less, which the cookieless design accepts.
 */
export function sessionIdFor(input: {
  site: string
  address: string | null
  userAgent: string
  env?: Readonly<Record<string, string | undefined>>
  now?: Date
}): string {
  const now = input.now ?? new Date()
  const secret =
    input.env?.ANALYTICS_SALT?.trim() || (processSeed ??= randomBytes(32).toString('hex'))
  const salt = saltFor(secret, dayKey(now))
  return createHash('sha256')
    .update(`${salt}|${input.site}|${input.address ?? ''}|${input.userAgent}`)
    .digest('hex')
}
