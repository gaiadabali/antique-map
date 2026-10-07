/**
 * The seed CLI (DATA.md §2): one layer, one command.
 *
 *   pnpm data:seed --layer <vocabulary|gallery-sample|gallery-full|shop> [--dry-run] [--publish]
 *
 * `--dry-run` applies the layer's files in transactions it then rolls back: the report is the
 * real one, nothing is written. `--publish` is the importer's publish-these-records flag, and it
 * publishes the vocabulary rows the seed names that are still drafts (`./vocabulary/publish`). The
 * reports print to stdout; the process exits non-zero when the layer could not even start.
 */
import { ImportError } from '../import/csv'
import { seedEnv } from './env'
import { renderSeedRun, SEED_LAYERS, seedLayer, type SeedLayer } from './run'

const USAGE =
  'Usage: pnpm data:seed --layer <vocabulary|gallery-sample|gallery-full|shop> [--dry-run] [--publish]'

function args(argv: readonly string[]): { layer: SeedLayer; dryRun: boolean; publish: boolean } {
  const out = { layer: '', dryRun: false, publish: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!
    if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--publish') out.publish = true
    else if (arg === '--layer') out.layer = argv[++i] ?? ''
    else throw new ImportError(`I do not know the option '${arg}'.`, USAGE)
  }
  if (!(SEED_LAYERS as readonly string[]).includes(out.layer)) {
    throw new ImportError(`Name a layer: ${SEED_LAYERS.join(', ')} (got '${out.layer}').`, USAGE)
  }
  return { ...out, layer: out.layer as SeedLayer }
}

async function main(): Promise<number> {
  const parsed = args(process.argv.slice(2))
  seedEnv()
  // cms() is the process's one instance (instance.ts); the CLI connects to the dev database.
  // Imported after the environment is filled: the config reads it at load time.
  const { cms } = await import('../instance')
  const payload = await cms()
  const { cliInvalidation, postCliTags } = await import('../import/cli-cache')
  const batch = cliInvalidation()
  const run = await seedLayer(parsed.layer, {
    payload,
    dryRun: parsed.dryRun,
    publish: parsed.publish,
    context: batch.context(),
  })
  console.log(renderSeedRun(run))
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
