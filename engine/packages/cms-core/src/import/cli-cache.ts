/**
 * The CLIs' cache invalidation (the seed and the import CLI run outside any Next request): their
 * writes hand the cache hooks' tags to one batch (`@engine/cache`'s `invalidationBatch()`, whose
 * context rides on every request the importer builds — `RunOptions.context`), and the CLI posts
 * them once its run has returned. Without a collector the hooks fall back to `after()`, which
 * throws outside a request — the seed's `--publish` crashed on it (2026-10-06).
 *
 * A CLI with no site to post to (no `REVALIDATE_ORIGIN`/`PORT`, or the site down) says how many
 * tags it could not post rather than failing the run: the writes have committed, and a running
 * site re-reads them on its next deploy or edit.
 */
import { invalidationBatch, type InvalidationBatch } from '@engine/cache'

export const cliInvalidation = (): InvalidationBatch => invalidationBatch()

export async function postCliTags(batch: InvalidationBatch): Promise<string> {
  const pending = batch.pending.length
  if (pending === 0) return 'cache: nothing to expire'
  try {
    const posted = await batch.flush()
    return `cache: ${posted} tag(s) expired on the running site`
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error)
    return `cache: ${batch.pending.length} tag(s) not posted (${why}); a running site re-reads them on its next deploy or edit`
  }
}
