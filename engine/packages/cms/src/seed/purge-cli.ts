/** The purge CLI: `pnpm data:purge-seed` — refuses production, deletes the seed rows, reports. */
import { seedEnv } from './env'
import { purgeSeed, purgeRefusal } from './purge'

async function main(): Promise<number> {
  const refusal = purgeRefusal()
  if (refusal !== null) {
    console.error(refusal)
    return 1
  }
  seedEnv()
  // cms() is the process's one instance (instance.ts); the CLI connects to the dev database.
  // Imported after the environment is filled: the config reads it at load time.
  const { cms } = await import('../instance')
  const payload = await cms()
  const report = await purgeSeed(payload)
  console.log(
    `purge-seed: ${report.products} product(s), ${report.stockLevels} stock row(s), ` +
      `${report.stores} store(s) deleted.`,
  )
  return 0
}

// Top-level await: `payload run` imports the script and exits — an un-awaited promise dies with it.
try {
  process.exit(await main())
} catch (error: unknown) {
  console.error(error)
  process.exit(1)
}
