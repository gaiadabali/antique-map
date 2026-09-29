// 3.3.b — a development `LINK_TOKEN_KEYS` ring for a worktree's .env.local, so a
// workstation passes `bootCheck()` (C6 `links`, DEPLOYMENT.md §8) without anyone
// inventing a secret by hand. The ring is ONE current key, `dev:<secret>`: a kid
// of a–z/0–9 and 32 fresh random bytes, base64url — the shape
// `parseLinkTokenKeys()` (`@engine/config/boot-check`) accepts. It is generated
// on this machine, written only to the gitignored .env.local, and never printed.
//
// An existing ring is never replaced, not even by `--force`: links already
// emailed from this worktree's database verify against it. A blank
// `LINK_TOKEN_KEYS=` line (a copied .env.example) is not a ring and is filled.
import { randomBytes } from 'node:crypto'

import { readEnvFile, writeEnvFile } from './env-file.mjs'

export const LINK_KEY_VARIABLE = 'LINK_TOKEN_KEYS'
export const DEV_KID = 'dev'
const SECRET_BYTES = 32
/** parseLinkTokenKeys() refuses fewer distinct byte values than this as a pattern. */
const MIN_DISTINCT_BYTES = 16

/**
 * Whether `parseLinkTokenKeys()` would refuse these bytes as not random — one byte
 * repeated, a pattern, or all printable text. Vanishingly rare for 32 random bytes;
 * checked so the generated ring can never be one it refuses.
 */
function looksPatterned(bytes) {
  const distinct = new Set(bytes).size
  const printable = bytes.every((byte) => byte >= 0x20 && byte <= 0x7e)
  return distinct < MIN_DISTINCT_BYTES || printable
}

/** A fresh one-key ring, `dev:<43 base64url characters>`. `random` is injectable for tests. */
export function generateDevRing(random = randomBytes) {
  let bytes
  do bytes = random(SECRET_BYTES)
  while (looksPatterned(bytes))
  return `${DEV_KID}:${Buffer.from(bytes).toString('base64url')}`
}

/**
 * Adds a fresh dev ring to the env file at `path` when it has none (absent or blank).
 * Returns `'added'` or `'kept'`; the ring's value is never returned or logged.
 */
export function ensureLinkTokenKeys(path, random = randomBytes) {
  const existing = readEnvFile(path).get(LINK_KEY_VARIABLE)
  if (existing !== undefined && existing.trim() !== '') return 'kept'
  // `force` only ever replaces a BLANK line here — a set ring returned 'kept' above.
  writeEnvFile(path, { [LINK_KEY_VARIABLE]: generateDevRing(random) }, { force: true })
  return 'added'
}
