// Legacy key normalisation and key collection for the 9.4.c check. The ticket's rule: import the
// builder's own normaliser rather than restate it (`@engine/migrate` is not a dependency of
// `@engine/tooling`, so its specifier will not resolve here; a relative import of the builder's TS
// does, and under Node 24 a `.ts` file runs unmodified). `normalise.test.mjs` pins the two together,
// so a change to the builder that this tool does not follow fails the check.
import { isSensitive } from './sensitive.mjs'

export {
  redirectKey,
  normalisePathname,
  dedupeLegacyUrls,
} from '../../packages/migrate/src/redirects/normalise.ts'

import { redirectKey } from '../../packages/migrate/src/redirects/normalise.ts'

/** One inventory row's normalised key: the path plus only the query the old page kept. */
export function keyOf(site, path) {
  const at = path.indexOf('?')
  return at === -1
    ? redirectKey(site, path)
    : redirectKey(site, path.slice(0, at), path.slice(at + 1))
}

/**
 * The keys the check requests for a site: sensitive paths dropped and counted, duplicates collapsed
 * (two legacy URLs that normalise alike are one request). Returns `{ keys, skippedSensitive }`.
 */
export function collectKeys(site, rows) {
  const keys = []
  const seen = new Set()
  let skippedSensitive = 0
  for (const row of rows) {
    if (isSensitive(row.path)) {
      skippedSensitive += 1
      continue
    }
    const key = keyOf(site, row.path)
    if (seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }
  return { keys, skippedSensitive }
}
