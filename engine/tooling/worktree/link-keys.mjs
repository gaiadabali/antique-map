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
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { readEnvFile, writeEnvFile } from './env-file.mjs'

export const LINK_KEY_VARIABLE = 'LINK_TOKEN_KEYS'
export const DEV_KID = 'dev'
const SECRET_BYTES = 32
/** More draws than this all refused is a broken `random`, not bad luck (each is ~10^-12). */
const MAX_DRAWS = 64

/**
 * C1's own `parseLinkTokenKeys()` (`@engine/config/boot-check`), so a generated ring is judged
 * by exactly the rules bootCheck() applies — v1.2's stepped runs and repeated blocks, and
 * whatever a later version adds — never by a copy of them here (TASKS.md 3.5.e). This file
 * runs under plain `node` (the `worktree:env` CLI), which cannot follow the package index's
 * extensionless imports, so it loads the one leaf module that holds the rule, `link-keys.ts`,
 * beside the index the package's `exports` names; that module imports nothing. Node strips
 * its types itself from 22.18; on the floor `engines.node` allows (22.13, CI's pin) it does
 * not, so the source is stripped with `module.stripTypeScriptTypes()` and imported from a
 * data URL instead.
 */
const LINK_KEYS_SOURCE = join(
  dirname(createRequire(import.meta.url).resolve('@engine/config/boot-check')),
  'link-keys.ts',
)

async function loadLinkKeyRules() {
  try {
    return await import(pathToFileURL(LINK_KEYS_SOURCE).href)
  } catch (error) {
    if (error?.code !== 'ERR_UNKNOWN_FILE_EXTENSION') throw error
    const javascript = stripTypeScriptTypes(readFileSync(LINK_KEYS_SOURCE, 'utf8'))
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
