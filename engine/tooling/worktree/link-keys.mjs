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
import { readFileSync } from 'node:fs'
import { createRequire, stripTypeScriptTypes } from 'node:module'

import { readEnvFile, writeEnvFile } from './env-file.mjs'

export const LINK_KEY_VARIABLE = 'LINK_TOKEN_KEYS'
export const DEV_KID = 'dev'
const SECRET_BYTES = 32
/** More draws than this all refused is a broken `random`, not bad luck (each is ~10^-12). */
const MAX_DRAWS = 64

/**
 * C1's own `parseLinkTokenKeys()`, from its `@engine/config/link-keys` export (3.4), so a
 * generated ring is judged by exactly the rules bootCheck() applies — stepped runs, repeated
 * blocks, base64url only, and whatever a later version adds — never by a copy of them here
 * (TASKS.md 3.5.e). This file runs under plain `node` (the `worktree:env` CLI), and the export
 * is a TypeScript source with no imports: Node strips its types itself from 22.18, but on the
 * floor `engines.node` allows (22.13, CI's pin) it does not, so there the source the export
 * resolves to is stripped with `module.stripTypeScriptTypes()` and imported from a data URL.
 */
const LINK_KEYS = '@engine/config/link-keys'

async function loadLinkKeyRules() {
  try {
    return await import(LINK_KEYS)
  } catch (error) {
    if (error?.code !== 'ERR_UNKNOWN_FILE_EXTENSION') throw error
    const source = readFileSync(createRequire(import.meta.url).resolve(LINK_KEYS), 'utf8')
    const javascript = stripTypeScriptTypes(source)
    return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
  }
}

const { parseLinkTokenKeys } = await loadLinkKeyRules()

/**
 * A fresh one-key ring, `dev:<43 base64url characters>`: 32 random bytes, drawn again until
 * `parseLinkTokenKeys()` accepts them (a refusal among random bytes is ~10^-12 a draw).
 * `random` is injectable for tests. Throws, naming no secret, if every draw is refused.
 */
export function generateDevRing(random = randomBytes) {
  for (let draw = 0; draw < MAX_DRAWS; draw += 1) {
    const ring = `${DEV_KID}:${Buffer.from(random(SECRET_BYTES)).toString('base64url')}`
    if (parseLinkTokenKeys(ring).ok) return ring
  }
  throw new Error(
    `${MAX_DRAWS} draws of ${SECRET_BYTES} bytes were all refused by parseLinkTokenKeys(): the random source is broken`,
  )
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

/** The order-link key (TASKS.md 6.6): AES-256-GCM, 32 random bytes, base64 — required by the boot check. */
export const ORDER_LINK_KEY_VARIABLE = 'ORDER_LINK_KEY'

/**
 * Adds a fresh dev `ORDER_LINK_KEY` to the env file at `path` when it has none (absent or blank).
 * Returns `'added'` or `'kept'`; the key is never returned or logged, and a set one is never replaced
 * (it seals every order link the worktree's database holds).
 */
export function ensureOrderLinkKey(path, random = randomBytes) {
  const existing = readEnvFile(path).get(ORDER_LINK_KEY_VARIABLE)
  if (existing !== undefined && existing.trim() !== '') return 'kept'
  writeEnvFile(path, { [ORDER_LINK_KEY_VARIABLE]: random(32).toString('base64') }, { force: true })
  return 'added'
}
