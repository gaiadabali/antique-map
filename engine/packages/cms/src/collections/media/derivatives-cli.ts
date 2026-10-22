/**
 * The media pipeline's backfill (TASKS.md 5.2): publishes the derivatives and tiles of every
 * `media` record not yet `ready` at the current version — seeded and imported images, which are
 * created outside a request (`./pipeline-hook`), and any earlier run that failed.
 *
 *   pnpm --filter @engine/cms media:derivatives [--force] [--id <media id>]…
 *
 * `--force` rebuilds records already up to date (a new `DERIVATIVE_VERSION` does so by itself).
 * Runs against the worktree's database and the `S3_*` media bucket, like the seed; one image at a
 * time. The cache tags of the works and products placing each image are posted to the running
 * site at the end, or counted as unposted when none is reachable. Exits non-zero when any record
 * failed, so a rerun is the retry.
 */
import { seedEnv } from '../../seed/env'

const USAGE = 'Usage: pnpm --filter @engine/cms media:derivatives [--force] [--id <media id>]…'

function args(argv: readonly string[]): { force: boolean; ids: number[] } {
  const out = { force: false, ids: [] as number[] }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!
    if (arg === '--force') out.force = true
    else if (arg === '--id' && /^[1-9]\d*$/.test(argv[i + 1] ?? '')) out.ids.push(Number(argv[++i]))
    else throw new Error(`I do not know the option '${arg}'.\n${USAGE}`)
  }
  return out
}

async function main(): Promise<number> {
  const { force, ids } = args(process.argv.slice(2))
  seedEnv()
  // Imported after the environment is filled: the config reads it at load time.
  const { cms } = await import('../../instance')
  const { cliInvalidation, postCliTags } = await import('../../import/cli-cache')
  const { deriveMedia } = await import('./pipeline')
  const payload = await cms()
  const batch = cliInvalidation()

  const targets =
    ids.length > 0
      ? ids
      : (
          await payload.find({
            collection: 'media',
            depth: 0,
            limit: 0,
            pagination: false,
            overrideAccess: true,
            sort: 'id',
            select: { id: true },
          })
        ).docs.map((doc) => doc.id as number)

  const counts: Record<string, number> = {}
  for (const id of targets) {
    const outcome = await deriveMedia(payload, id, { force, context: batch.context() })
    const key = outcome.status === 'skipped' ? `skipped (${outcome.reason})` : outcome.status
    counts[key] = (counts[key] ?? 0) + 1
    if (outcome.status === 'ready') {
      console.log(`media ${id}: ready, ${outcome.written} object(s), tiles ${outcome.tiles}`)
    } else if (outcome.status === 'failed') {
      console.log(`media ${id}: failed — ${outcome.reason}`)
    }
  }
  const summary = Object.entries(counts)
    .map(([status, n]) => `${n} ${status}`)
    .join(', ')
  console.log(`media:derivatives: ${targets.length} record(s): ${summary || 'none'}`)
  if ((counts['skipped (no-storage)'] ?? 0) > 0) {
    console.log('No media bucket or MEDIA_PUBLIC_URL is configured: nothing could be published.')
  }
  console.log(await postCliTags(batch))
  return (counts.failed ?? 0) > 0 ? 1 : 0
}

// Top-level await: `payload run` imports the script and exits — an un-awaited promise dies with it.
try {
  process.exit(await main())
} catch (error: unknown) {
  console.error(error)
  process.exit(1)
}
