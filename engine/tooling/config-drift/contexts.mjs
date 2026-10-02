// The one environment `check:generated` runs the generators in (TASKS.md 1.3.c): this process's,
// built on purpose rather than inherited. The child sees no DATABASE_URL (a generator never
// touches a database, CONVENTIONS.md §12), no PAYLOAD_SECRET (the scripts set a placeholder;
// `generate:types` needs none), no dev push or boot-migration switch, and no brand variable a
// parent shell may still carry: one app, one config, one context.
import { withoutKeys } from '../db/pnpm.mjs'

/** Everything a parent shell may carry that could reach a database or shape the config. */
export const WITHHELD_KEYS = [
  'BRAND',
  'BRAND_ROOT',
  'TEST_STOREFRONT',
  'DATABASE_URL',
  'PAYLOAD_SECRET',
  'PAYLOAD_DEV_PUSH',
  'RUN_MIGRATIONS',
  'PAYLOAD_TS_OUTPUT_PATH',
  'ROOT_DIR',
  'PGHOST',
  'PGPORT',
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
]

/** The generators' environment: `parentEnv` minus WITHHELD_KEYS. */
export function generatorEnv(parentEnv = process.env) {
  return withoutKeys(parentEnv, WITHHELD_KEYS)
}
