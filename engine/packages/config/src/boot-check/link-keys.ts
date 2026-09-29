/**
 * `LINK_TOKEN_KEYS` — the capability links' key ring (C6 `links`, DEPLOYMENT.md §8), parsed
 * and refused whole if any entry is wrong. Comma-separated entries:
 *
 *   kid ":" secret                  the current key: exactly one, it derives every new token
 *   kid ":" secret ":" YYYY-MM-DD   retired that UTC day; it still verifies for C6's overlap
 *   kid ":revoked"                  refuses at once (a leaked key)
 *
 * A `kid` is 1–12 characters of a–z and 0–9 and is never used twice; a secret is base64url of
 * at least 32 random bytes — never one byte repeated, which is what C6's test vectors' key is
 * (32 × 0x0b), so a ring copied from the vectors never starts anywhere; never fewer than 16
 * distinct byte values (a pattern) and never all printable text (a password, base64-encoded);
 * a retirement day is never in the future. The parsed ring is what the links module (TASKS.md 18.2.g) derives and
 * verifies with. No message ever carries a secret.
 */

export type LinkTokenKey =
  | { readonly kid: string; readonly status: 'current'; readonly secret: Uint8Array }
  | {
      readonly kid: string
      readonly status: 'retired'
      readonly secret: Uint8Array
      /** The UTC day it was retired, `YYYY-MM-DD`. */
      readonly retiredOn: string
    }
  | { readonly kid: string; readonly status: 'revoked' }

export type LinkKeyRing = {
  readonly current: Extract<LinkTokenKey, { status: 'current' }>
  /** Every entry, in the order written. */
  readonly keys: readonly LinkTokenKey[]
}

export type LinkKeyRingResult =
  | {
      readonly ok: true
      readonly ring: LinkKeyRing
      readonly problems: readonly []
      /** Harmless but worth a look: a retired key past its overlap can leave the ring. */
      readonly warnings: readonly string[]
    }
  | {
      readonly ok: false
      readonly ring: null
      readonly problems: readonly string[]
      readonly warnings: readonly string[]
    }

const KID = /^[a-z0-9]{1,12}$/
const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/
export const LINK_KEY_MIN_BYTES = 32
/** Fewer distinct byte values than this is a pattern, not randomness (32 random bytes have ~30). */
export const LINK_KEY_MIN_DISTINCT_BYTES = 16
/**
 * C6 `LINK_TOKEN.keyOverlapDays`, mirrored: config imports no other package. A retired key
 * verifies this long, then refuses; past it, it is only clutter in the ring.
 */
export const LINK_KEY_OVERLAP_DAYS = 400
const DAY_MS = 86_400_000

export function parseLinkTokenKeys(
  value: string | undefined,
  now: Date = new Date(),
): LinkKeyRingResult {
  if (value === undefined || value.trim() === '') {
    return fail([
      'is not set: every emailed and addressed link is derived from its current key (C6 links)',
    ])
  }
  const problems: string[] = []
  const warnings: string[] = []
  const keys: LinkTokenKey[] = []
  const seenKids = new Set<string>()
  const seenSecrets = new Set<string>()
  const today = now.toISOString().slice(0, 10)

  value.split(',').forEach((raw, index) => {
    const entry = raw.trim()
    const at = `entry ${index + 1}`
    if (entry === '') return void problems.push(`${at} is empty (a stray comma?)`)
    const [kid = '', ...rest] = entry.split(':')
    if (!KID.test(kid)) {
      return void problems.push(`${at}: its kid is not 1–12 characters of a–z and 0–9`)
    }
    const named = `${at} (kid "${kid}")`
    if (seenKids.has(kid)) problems.push(`${named}: the kid is used twice — a kid is never reused`)
    seenKids.add(kid)
    if (rest.length === 1 && rest[0] === 'revoked')
      return void keys.push({ kid, status: 'revoked' })
    if (rest.length !== 1 && rest.length !== 2) {
      return void problems.push(`${named}: not kid:secret, kid:secret:YYYY-MM-DD or kid:revoked`)
    }
    const [encoded = '', retiredOn] = rest
    const secret = decodeSecret(encoded)
    if (typeof secret === 'string') return void problems.push(`${named}: ${secret}`)
    const fingerprint = Buffer.from(secret).toString('base64url')
    if (seenSecrets.has(fingerprint))
      problems.push(`${named}: the same secret appears under another kid`)
    seenSecrets.add(fingerprint)
    if (retiredOn === undefined) return void keys.push({ kid, status: 'current', secret })
    const day = checkDay(retiredOn, today)
    if (day) return void problems.push(`${named}: ${day}`)
    keys.push({ kid, status: 'retired', secret, retiredOn })
    const age = Math.floor((Date.parse(today) - Date.parse(retiredOn)) / DAY_MS)
    if (age > LINK_KEY_OVERLAP_DAYS) {
      warnings.push(
        `${named}: retired ${age} days ago, past the ${LINK_KEY_OVERLAP_DAYS}-day overlap: it verifies nothing now and can be removed`,
      )
    }
  })

  const current = keys.filter((key) => key.status === 'current')
  if (current.length === 0 && problems.length === 0) {
    problems.push('has no current key (kid:secret with no date): nothing could derive a new link')
  }
  if (current.length > 1) {
    const kids = current.map((key) => `"${key.kid}"`).join(', ')
    problems.push(
      `has ${current.length} current keys (${kids}): exactly one derives new links; date the others`,
    )
  }
  const [only] = current
  if (problems.length > 0 || !only) return fail(problems, warnings)
  return { ok: true, ring: { current: only, keys }, problems: [], warnings }
}

function fail(problems: string[], warnings: string[] = []): LinkKeyRingResult {
  return { ok: false, ring: null, problems, warnings }
}

/** The secret's bytes, or why they are refused. */
function decodeSecret(encoded: string): Uint8Array | string {
  const bare = encoded.replace(/=+$/, '')
  if (!BASE64URL.test(encoded) || bare.length % 4 === 1) return 'the secret is not base64url'
  const bytes = Buffer.from(bare, 'base64url')
  // Node's decoder skips what it cannot read; re-encoding proves every character was data.
  if (bytes.toString('base64url') !== bare) return 'the secret is not canonical base64url'
  if (bytes.length < LINK_KEY_MIN_BYTES) {
    return `the secret is ${bytes.length} bytes; it needs ${LINK_KEY_MIN_BYTES} random bytes or more`
  }
  if (bytes.every((byte) => byte === bytes[0])) {
    return 'the secret is one byte repeated — a test key (C6 LINK_TOKEN_VECTORS uses one), never a real one'
  }
  const distinct = new Set(bytes).size
  if (distinct < LINK_KEY_MIN_DISTINCT_BYTES) {
    return `the secret has ${distinct} distinct byte values, fewer than ${LINK_KEY_MIN_DISTINCT_BYTES}: a pattern, not random bytes`
  }
  if (bytes.every((byte) => byte >= 0x20 && byte <= 0x7e)) {
    return 'the secret decodes to printable text — a password encoded, not random bytes (openssl rand -base64 32)'
  }
  return new Uint8Array(bytes)
}

function checkDay(day: string, today: string): string | null {
  const match = DAY.exec(day)
  const [year, month, date] = (match?.slice(1) ?? []).map(Number)
  const valid =
    match &&
    year !== undefined &&
    month !== undefined &&
    date !== undefined &&
    new Date(Date.UTC(year, month - 1, date)).toISOString().slice(0, 10) === day
  if (!valid) return `retirement day "${day}" is not a calendar date YYYY-MM-DD`
  if (day > today)
    return `retirement day ${day} is in the future (today is ${today} UTC): retire a key when it stops deriving`
  return null
}
