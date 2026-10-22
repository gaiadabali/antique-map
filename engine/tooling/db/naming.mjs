// Pure argument and naming rules for the db CLI: no I/O, so they are unit-tested on their own
// (naming.test.mjs). One app, one database per worktree (DEPLOYMENT.md §1): `indies_<suffix>`.
// The one rule that matters most: two worktrees on different suffixes never compute the same
// database name.

const SUFFIX_PATTERN = /^[a-z][a-z0-9_]*$/
// Postgres identifiers are truncated silently past 63 bytes — two names that
// only differ after that point would collide without warning.
const POSTGRES_IDENTIFIER_LIMIT = 63

/** Every database this tool makes starts so: `indies_<suffix>`. */
export const DATABASE_PREFIX = 'indies'

export class ArgError extends Error {}

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

/** The database for a worktree's suffix: `indies_<suffix>` (`p2_plt` → `indies_p2_plt`). */
export function databaseName(suffix) {
  const name = `${DATABASE_PREFIX}_${suffix}`
  if (name.length > POSTGRES_IDENTIFIER_LIMIT) {
    throw new ArgError(
      `database name "${name}" is ${name.length} characters, over Postgres's ${POSTGRES_IDENTIFIER_LIMIT}-byte identifier limit — shorten --suffix`,
    )
  }
  return name
}

/** The suffix a name `databaseName()` could have made holds, or `null` (`db:list`'s annotation). */
export function parseDatabaseName(name) {
  const prefix = `${DATABASE_PREFIX}_`
  if (!name.startsWith(prefix)) return null
  const suffix = name.slice(prefix.length)
  return SUFFIX_PATTERN.test(suffix) ? { suffix } : null
}
