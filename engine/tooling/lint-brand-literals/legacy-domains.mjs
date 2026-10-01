// The brands' legacy domains (docs/MIGRATION.md: the live store's domain, the
// alias that 301s to it, and the emporium's old domain) are banned under
// `engine/` like any brand literal (TASKS.md 5.6.b, gate F3), but no brand
// config names them yet (its `domains` are a draft's), and this file lives
// under `engine/`, so it cannot spell them either. It keeps their SHA-256
// digests instead: every hostname-shaped token in a scanned line, and each of
// its parent domains (`www.x.y` is also `x.y`), is lower-cased and hashed, and
// a digest on this list is a violation. A domain added here is hashed with
//   node -e "console.log(require('crypto').createHash('sha256').update('<domain>').digest('hex'))"
// and must be one MIGRATION.md documents (legacy-domains.test.mjs checks it).
import { createHash } from 'node:crypto'

export const LEGACY_DOMAIN_DIGESTS = Object.freeze([
  '02650a05594a79714cc16f461f7d314c2797faffc8e28a4bd0c6732508ce180a',
  '4a075a3c1aa563d12dadd1e9593746800840007adf2a7adbb0ea8bb9618edfd3',
  'a92c41e01ceba068e7f2b24d1eb89c7e116f6999b90bea12e4ae4976cd71c5e3',
])

// Two or more dot-separated DNS labels: a hostname, or anything spelled like one
// (`config.domains.aliases` too, which hashes to nothing on the list).
const HOSTNAME = /[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+/gi

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

/** `a.b.c.d` → `['a.b.c.d', 'b.c.d', 'c.d']`: the name and every parent with two labels or more. */
function withParents(hostname) {
  const labels = hostname.split('.')
  return labels.slice(0, -1).map((_, i) => labels.slice(i).join('.'))
}

/**
 * A matcher for one scan: `hits(line)` is every legacy domain `line` spells, as
 * it spells it (lower-cased), once each. Digests are cached per token, so a
 * repeated property chain is hashed once.
 */
export function legacyDomainMatcher(digests = LEGACY_DOMAIN_DIGESTS) {
  const banned = new Set(digests)
  const seen = new Map()
  const isBanned = (name) => {
    if (!seen.has(name)) seen.set(name, banned.has(sha256(name)))
    return seen.get(name)
  }
  return (line) => {
    if (banned.size === 0) return []
    const found = new Set()
    for (const [token] of line.matchAll(HOSTNAME)) {
      for (const name of withParents(token.toLowerCase())) {
        if (isBanned(name)) found.add(name)
      }
    }
    return [...found]
  }
}
