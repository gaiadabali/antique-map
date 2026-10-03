/** The purge CLI: `pnpm data:purge-seed` — refuses production, deletes the seed rows, reports. */
import { cms } from '../instance'
import { purgeSeed, purgeRefusal } from './purge'

async function main(): Promise<number> {
  const refusal = purgeRefusal()
  if (refusal !== null) {
    console.error(refusal)
    return 1
  }
  // cms() is the process's one instance (instance.ts); the CLI connects to the dev database.
  const payload = await cms()
  const report = await purgeSeed(payload)
  console.log(
    `purge-seed: ${report.products} product(s), ${report.stockLevels} stock row(s), ` +
      `${report.stores} store(s), ${report.discounts} discount(s) deleted.`,
  )
  return 0
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
