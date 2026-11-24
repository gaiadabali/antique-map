// Pure argument and naming rules for the db CLI: no I/O, so they are unit-tested on their own
// (naming.test.mjs). One database per app per worktree (PLAN-V2 §4.4, DEPLOYMENT.md §1):
//   gallery  `indies_<suffix>`       — today's app (engine/apps/web, @engine/cms) until phase 25
//   shop     `indies_shop_<suffix>`  — the shop app (engine/apps/shop, @engine/cms-shop)
// The one rule that matters most: two worktrees on different suffixes, or one worktree's two apps,
// never compute the same database name — so a suffix may not itself start with an app's prefix.

const SUFFIX_PATTERN = /^[a-z][a-z0-9_]*$/
// Postgres identifiers are truncated silently past 63 bytes — two names that
// only differ after that point would collide without warning.
const POSTGRES_IDENTIFIER_LIMIT = 63

/** Every database this tool makes starts so: `indies_<suffix>`. */
export const DATABASE_PREFIX = 'indies'

/**
 * Each app: its database prefix (before the suffix), the CMS package that migrates it, and the
 * app folder whose `.env.local` names it. `gallery` is today's one app until phase 25 moves the
 * gallery into its own (`indies_gallery_<suffix>` then).
 */
export const APPS = Object.freeze({
  gallery: Object.freeze({
    prefix: `${DATABASE_PREFIX}_`,
    cms: '@engine/cms',
    dir: 'engine/apps/web',
  }),
  shop: Object.freeze({
    prefix: `${DATABASE_PREFIX}_shop_`,
    cms: '@engine/cms-shop',
    dir: 'engine/apps/shop',
  }),
})
export const DEFAULT_APP = 'gallery'
/** `web` (the seed's and the folder's word for today's app) is the gallery's alias. */
const APP_ALIASES = Object.freeze({ web: 'gallery' })
/** A suffix starting so would read as another app's database (`indies_shop_x` is the shop's `x`). */
const RESERVED_SUFFIX = /^(shop|gallery)(_|$)/

export class ArgError extends Error {}

/** Validates `--app`: `shop`, `gallery` or its alias `web`; absent is today's app. */
export function parseApp(value) {
  if (value == null) return DEFAULT_APP
  const text = String(value).trim().toLowerCase()
  const app = APP_ALIASES[text] ?? text
  if (!Object.hasOwn(APPS, app)) {
    throw new ArgError(`--app is shop or gallery (web is gallery's alias), got "${value}"`)
  }
  return app
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
  if (RESERVED_SUFFIX.test(text)) {
    throw new ArgError(`--suffix may not start with an app's name (shop, gallery), got "${text}"`)
  }
  return text
}

/** The database for an app and a worktree's suffix (`p2_plt` → `indies_p2_plt`, `indies_shop_p2_plt`). */
export function databaseName(suffix, app = DEFAULT_APP) {
  const name = `${APPS[parseApp(app)].prefix}${suffix}`
  if (name.length > POSTGRES_IDENTIFIER_LIMIT) {
    throw new ArgError(
      `database name "${name}" is ${name.length} characters, over Postgres's ${POSTGRES_IDENTIFIER_LIMIT}-byte identifier limit — shorten --suffix`,
    )
  }
  return name
}

/** `{ app, suffix }` a name `databaseName()` could have made, or `null` (`db:list`'s annotation). */
export function parseDatabaseName(name) {
  // Longest prefix first: `indies_shop_x` is the shop's, never the gallery's `shop_x`.
  const apps = Object.entries(APPS).sort(([, a], [, b]) => b.prefix.length - a.prefix.length)
  for (const [app, { prefix }] of apps) {
    if (!name.startsWith(prefix)) continue
    const suffix = name.slice(prefix.length)
    if (!SUFFIX_PATTERN.test(suffix)) return null
    if (app === DEFAULT_APP && RESERVED_SUFFIX.test(suffix)) return null
    return { app, suffix }
  }
  return null
}
