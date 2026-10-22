/**
 * `pnpm data:seed-pages [--publish]` — the shop's built-in pages into the CMS (`./pages`). Without
 * `--publish` they are drafts and the site keeps drawing its built-in words until someone publishes
 * them in the admin.
 *
 * Run through Payload (`payload run`, from the CMS package, which finds the config); the cache tags
 * the writes expire are posted to the running app once the run returns.
 */
import { cliInvalidation, postCliTags } from '@engine/cms/import'
import { seedEnv } from '@engine/cms/seed'

import { seedShopPages } from './pages'

async function main(): Promise<number> {
  const publish = process.argv.slice(2).includes('--publish')
  seedEnv()
  // Imported after the environment is filled: the config reads it at load time.
  const { cms } = await import('@engine/cms/instance')
  const payload = await cms()
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
