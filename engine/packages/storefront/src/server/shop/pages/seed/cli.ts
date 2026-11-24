/**
 * `pnpm data:seed-pages [--publish]` — the shop's built-in pages into the CMS (`./pages`). Without
 * `--publish` they are drafts, and the site shows no such page (the home its bare shell, the others
 * a 404) until someone publishes them in the admin.
 *
 * `--app shop` writes them into the shop's own CMS and database (`@engine/cms-shop`, PLAN-V2 §4.4)
 * instead of today's one: `pnpm data:seed --app shop` runs it after the shop's layers
 * (`@engine/cms-shop`'s `seed/app.mjs`), from that package, so `payload run` finds its config.
 *
 * Run through Payload (`payload run`, from the CMS package, which finds the config); the cache tags
 * the writes expire are posted to the running app once the run returns.
 */
import { cliInvalidation, postCliTags } from '@engine/cms-core/import/cli-cache'
import type { Payload } from 'payload'

import { seedShopPages } from './pages'

/** The CMS the pages go to: the shop's own with `--app shop`, else today's one. */
async function cmsFor(shop: boolean): Promise<Payload> {
  if (shop) {
    const { seedEnv, shopDatabaseRefusal } = await import('@engine/cms-shop/seed')
    seedEnv(process.env, 'shop')
    // Imported after the environment is filled: the config reads it at load time.
    const { shopCms } = await import('@engine/cms-shop/instance')
    const payload = await shopCms()
    const refusal = await shopDatabaseRefusal(payload)
    if (refusal !== null) throw new Error(refusal)
    return payload
  }
  const { seedEnv } = await import('@engine/cms/seed')
  seedEnv()
  const { cms } = await import('@engine/cms/instance')
  return cms()
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const publish = argv.includes('--publish')
  const at = argv.indexOf('--app')
  const payload = await cmsFor(at !== -1 && argv[at + 1] === 'shop')
  const batch = cliInvalidation()
  for (const line of await seedShopPages(payload, { publish, context: batch.context() as never })) {
    console.log(line)
  }
  console.log(await postCliTags(batch))
  return 0
}

// Top-level await: `payload run` imports the script and exits — an un-awaited promise dies with it.
try {
  process.exit(await main())
} catch (error: unknown) {
  console.error(error)
  process.exit(1)
}
