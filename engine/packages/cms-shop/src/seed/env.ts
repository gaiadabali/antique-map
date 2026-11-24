/**
 * The CLIs' environment, filled the way the db tooling fills the migrate child's (engine/tooling/db
 * `migrate.mjs` — the same rules, restated here so the seed needs no path out of the package):
 * a worktree's database is `<prefix><DB_SUFFIX>` on the Postgres `POSTGRES_*` (or `PG*`) names,
 * and the secret is a development placeholder — a CLI signs nothing, and a real secret is never
 * handed to a tool. `DATABASE_URL` and `PAYLOAD_SECRET` already in the process's environment are
 * never second-guessed.
 *
 * Two CMSs, two databases (PLAN-V2 §4.4): today's one CMS seeds `indies_<suffix>` and reads the
 * worktree file's `DATABASE_URL`; the shop's seeds `indies_shop_<suffix>` and **never** takes a
 * `DATABASE_URL` from a file — the worktree's `.env.local` names today's database until each app
 * has its own (TASKS.md 24.2), and a shop seed written into it would mix two schemas. Only an
 * app's own `.env.local` (`engine/apps/shop/.env.local`) may name the shop's database.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
const DEV_PAYLOAD_SECRET = 'db-fresh-dev-only-never-signs-anything'

export type SeedApp = 'web' | 'shop'

/** Each app's database name before the worktree's suffix (`docs/PLAN-V2.md` §4.4). */
export const DATABASE_PREFIX: Readonly<Record<SeedApp, string>> = {
  web: 'indies_',
  shop: 'indies_shop_',
}

function readEnvFile(file: string): Record<string, string> {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return {}
  }
  const values: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const entry = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!entry) continue
    const value = entry[2]!.trim().replace(/^"(.*)"$/, '$1')
    values[entry[1]!] = value === '' ? '' : value
  }
  return values
}

/**
 * The worktree's `.env.local` (then a plain `.env`), read the way `engine/tooling/worktree`
 * reads it: only keys the environment does not already carry are filled in — the process's own
 * environment always wins. `payload run`'s own walk does not reach the repo root's `.env.local`
 * from the package's folder, so the seed reads it itself.
 */
export function readWorktreeEnv(start = import.meta.dirname): Record<string, string> {
  let dir = start
  for (;;) {
    if (existsSync(join(dir, '.env.local'))) {
      return { ...readEnvFile(join(dir, '.env')), ...readEnvFile(join(dir, '.env.local')) }
    }
    const parent = dirname(dir)
    if (parent === dir) return {}
    dir = parent
  }
}

/** The shop app's own `.env.local`, when the worktree has one (TASKS.md 24.2). */
function readShopAppEnv(start = import.meta.dirname): Record<string, string> {
  let dir = start
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return readEnvFile(join(dir, 'engine', 'apps', 'shop', '.env.local'))
    }
    const parent = dirname(dir)
    if (parent === dir) return {}
    dir = parent
  }
}

export function seedDatabaseUrl(
  env: Readonly<Record<string, string | undefined>>,
  prefix: string = DATABASE_PREFIX.web,
): string | null {
  if (env.DATABASE_URL !== undefined && env.DATABASE_URL !== '') return env.DATABASE_URL
  if (env.DB_SUFFIX === undefined || env.DB_SUFFIX.trim() === '') return null
  const user = env.PGUSER || env.POSTGRES_USER || 'postgres'
  const password = env.PGPASSWORD ?? env.POSTGRES_PASSWORD ?? 'postgres'
  const host = env.PGHOST || env.POSTGRES_HOST || 'localhost'
  const port = env.PGPORT || env.POSTGRES_PORT || '5432'
  const database = `${prefix}${env.DB_SUFFIX.trim()}`
  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
  return `postgres://${auth}@${host}:${port}/${encodeURIComponent(database)}`
}

/**
 * Fills the process's environment in place, before the CMS boots. Throws when it cannot. `app`
 * picks the database (see the header); today's CMS is the default.
 */
export function seedEnv(
  env: Record<string, string | undefined> = process.env,
  app: SeedApp = 'web',
): void {
  const fromFiles =
    app === 'shop'
      ? { ...withoutDatabaseUrl(readWorktreeEnv()), ...readShopAppEnv() }
      : readWorktreeEnv()
  for (const [key, value] of Object.entries(fromFiles)) {
    if (env[key] === undefined) env[key] = value
  }
  const url = seedDatabaseUrl(env, DATABASE_PREFIX[app])
  if (url === null) {
    throw new Error(
      'No DATABASE_URL and no DB_SUFFIX to derive one from. Run inside a worktree ' +
        '(`pnpm worktree:env`), or set DATABASE_URL.',
    )
  }
  env.DATABASE_URL = url
  if (env.PAYLOAD_SECRET === undefined || env.PAYLOAD_SECRET === '') {
    env.PAYLOAD_SECRET = DEV_PAYLOAD_SECRET
  }
}

function withoutDatabaseUrl(values: Record<string, string>): Record<string, string> {
  const { DATABASE_URL: _ignored, ...rest } = values
  return rest
}
