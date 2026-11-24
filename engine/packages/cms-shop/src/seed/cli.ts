/**
 * The shop's seed CLI (DATA.md §2, PLAN-V2 §4.4), against the shop's own database:
 *
 *   pnpm data:seed --app shop [--layer <vocabulary|shop|shop-catalogue|pictures>] [--dry-run]
 *                             [--publish] [--rows]
 *
 * With no `--layer` it runs the whole shop seed in order, as the admin's seed screen does:
 * vocabulary (published), the mock shop (drafts), the catalogue (published, the mocks retired), the
 * pictures' web sizes — and then the root script runs the storefront's built-in pages
 * (`./app.mjs`), which live with their copy in `@engine/storefront`. `--dry-run` applies the
 * imports in transactions it rolls back. `--rows` prints every row's line (thousands for stock).
 *
 * The database is the process's `DATABASE_URL`, else `indies_shop_<DB_SUFFIX>` (`./env`: a
 * `DATABASE_URL` in the worktree's `.env.local` names today's database and is never taken), and a
 * database holding the gallery's works is refused before any write (`./guard`). Media go where the
 * config's storage says: the shop's bucket (`S3_*`), else local disk.
 */
import { ImportError } from '@engine/cms-core/import/csv'

import { seedEnv } from './env'
import { renderShopSeedRun } from './render'
import { SHOP_SEED_ALL, SHOP_SEED_LAYERS, type ShopSeedLayer } from './run'

const USAGE =
  'Usage: pnpm data:seed --app shop [--layer <vocabulary|shop|shop-catalogue|pictures>] ' +
  '[--dry-run] [--publish] [--rows]'

type Args = { layer: ShopSeedLayer | null; dryRun: boolean; publish: boolean; rows: boolean }

function args(argv: readonly string[]): Args {
  const out = { layer: '', dryRun: false, publish: false, rows: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!
    if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--publish') out.publish = true
    else if (arg === '--rows') out.rows = true
    else if (arg === '--layer') out.layer = argv[++i] ?? ''
    else if (arg === '--') continue
    else throw new ImportError(`I do not know the option '${arg}'.`, USAGE)
  }
  if (out.layer !== '' && !(SHOP_SEED_LAYERS as readonly string[]).includes(out.layer)) {
    throw new ImportError(
      `Name a layer: ${SHOP_SEED_LAYERS.join(', ')} (got '${out.layer}').`,
      USAGE,
    )
  }
  return { ...out, layer: out.layer === '' ? null : (out.layer as ShopSeedLayer) }
}

/** The whole seed publishes what the shop shows; the mock products stay drafts (they retire). */
const publishes = (layer: ShopSeedLayer) => layer === 'vocabulary' || layer === 'shop-catalogue'

async function main(): Promise<number> {
  const parsed = args(process.argv.slice(2))
  seedEnv(process.env, 'shop')
  // Imported after the environment is filled: the config reads it at load time.
  const { shopCms } = await import('../instance')
  const { shopDatabaseRefusal } = await import('./guard')
  const { seedShopLayer } = await import('./run')
  const { cliInvalidation, postCliTags } = await import('@engine/cms-core/import/cli-cache')
  const payload = await shopCms()
  const refusal = await shopDatabaseRefusal(payload)
  if (refusal !== null) throw new ImportError(refusal, USAGE)
  const batch = cliInvalidation()
  const steps = parsed.layer === null ? SHOP_SEED_ALL : [parsed.layer]
  for (const layer of steps) {
    const run = await seedShopLayer(layer, {
      payload,
      dryRun: parsed.dryRun,
      publish: parsed.layer === null ? publishes(layer) : parsed.publish,
      context: batch.context(),
    })
    console.log(renderShopSeedRun(run, { brief: !parsed.rows }))
  }
  console.log(await postCliTags(batch))
  return 0
}

// Top-level await: `payload run` imports the script and exits — an un-awaited promise dies with it.
try {
  process.exit(await main())
} catch (error: unknown) {
  if (error instanceof ImportError) {
    console.error(`${error.message}${error.fix ? `\n${error.fix}` : ''}`)
  } else {
    console.error(error)
  }
  process.exit(1)
}
