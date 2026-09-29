// Pure argument and naming rules for the db CLI (TASKS.md 2.1.b): no I/O, so
// they are unit-tested on their own (naming.test.mjs). The one rule that
// matters most: two worktrees on different suffixes must never compute the
// same database name, and a brand slug must never be a literal under
// engine/ — it always comes from an arg or a discovered brand folder
// (brands.mjs), never hard-coded here.

const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/
const SUFFIX_PATTERN = /^[a-z][a-z0-9_]*$/
// A storefront is an app's name as a brand's per-storefront config names it
// (`site/brand.<storefront>.json`) — letters and digits, so it is name-safe.
const STOREFRONT_PATTERN = /^[a-z][a-z0-9]*$/
// Postgres identifiers are truncated silently past 63 bytes — two names that
// only differ after that point would collide without warning.
const POSTGRES_IDENTIFIER_LIMIT = 63

export class ArgError extends Error {}

/** Validates a `--brand` value's shape; membership in the repo's actual brand folders is checked by the caller against `discoverBrands()`. */
export function parseBrandSlug(value) {
  const text = String(value ?? '').trim()
  if (text === '') throw new ArgError('--brand is required')
  if (!SLUG_PATTERN.test(text)) {
    throw new ArgError(`--brand must be a lower-case slug (letters, digits, dashes), got "${text}"`)
  }
  return text
}

/** Validates a `--suffix` value's shape (a Postgres-identifier-safe fragment, e.g. a worktree's DB_SUFFIX). */
export function parseSuffix(value) {
  const text = String(value ?? '').trim()
  if (text === '') {
    throw new ArgError(
      '--suffix is required (no DB_SUFFIX in .env.local — pass --suffix explicitly outside a worktree)',
    )
  }
  if (!SUFFIX_PATTERN.test(text) || text.length > 40) {
    throw new ArgError(
      `--suffix must be lower-case letters, digits or underscores, at most 40 characters, got "${text}"`,
    )
  }
  return text
}

/** Validates a `--storefront` value's shape; the brand's own storefronts are checked by the caller (`brandLayout()`). */
export function parseStorefront(value) {
  const text = String(value ?? '').trim()
  if (!STOREFRONT_PATTERN.test(text)) {
    throw new ArgError(
      `--storefront must be a storefront name (lower-case letters and digits), got "${text}"`,
    )
  }
  return text
}

/**
 * The database name for a (brand, suffix) pair: the brand slug with dashes
 * turned into underscores, then the suffix — so `fixture-atlas` + `p2_har`
 * is `fixture_atlas_p2_har`. Two different (brand, suffix) pairs always
 * differ here as long as each is valid, which is what keeps two worktrees'
 * databases apart (PARALLEL-TRACKS.md §3.1). A brand with one config per
 * storefront (the synthetic brand, TASKS.md 3.5.c) has one database per
 * storefront, named after the suffix: `test` + `p3_har` + `gallery` is
 * `test_p3_har_gallery` — a brand of that kind always names its storefront, so
 * it never also has a bare `test_p3_har` a storefront could be confused with.
 */
export function databaseName(brand, suffix, storefront = null) {
  const brandPart = brand.replace(/-/g, '_')
  const name = storefront ? `${brandPart}_${suffix}_${storefront}` : `${brandPart}_${suffix}`
  if (name.length > POSTGRES_IDENTIFIER_LIMIT) {
    throw new ArgError(
      `database name "${name}" is ${name.length} characters, over Postgres's ${POSTGRES_IDENTIFIER_LIMIT}-byte identifier limit — shorten --suffix`,
    )
  }
  return name
}

/**
 * True for a name `databaseName()` could have produced for one of `brands`
 * (used by `db:list` to annotate rows, and to guard `db:drop` against
 * dropping an unrelated database). Tries the longest brand prefix first, so
 * a brand whose slug prefixes another's (e.g. `old` and `fixture-emporium`)
 * never shadows the longer, more specific match. `storefrontsOf(brand)` names
 * a per-storefront brand's storefronts, so its trailing `_<storefront>` is
 * reported as one rather than as part of the suffix.
 */
export function parseDatabaseName(name, brands, storefrontsOf = () => []) {
  const byLongestPrefix = [...brands].sort((a, b) => b.length - a.length)
  for (const brand of byLongestPrefix) {
    const prefix = `${brand.replace(/-/g, '_')}_`
    if (name.startsWith(prefix) && name.length > prefix.length) {
      const rest = name.slice(prefix.length)
      for (const storefront of storefrontsOf(brand)) {
        const tail = `_${storefront}`
        if (rest.endsWith(tail) && rest.length > tail.length) {
          return { brand, suffix: rest.slice(0, -tail.length), storefront }
        }
      }
      return { brand, suffix: rest }
    }
  }
  return null
}
