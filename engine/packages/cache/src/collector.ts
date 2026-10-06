/**
 * What a hook's `invalidate()` finds on Payload's `req.context` outside a Next request
 * (ARCHITECTURE.md §9): a collector, put there by its caller's batch (`./batch`). There is no
 * response for `after()` to follow, and Payload runs `afterChange` before it commits, so the hook
 * never posts: it hands its tags to the collector, and the batch posts them once the caller's
 * work has returned — once it has committed.
 *
 * Two collectors, both a batch's:
 * - an **operation's** (`batch.operation()`), which holds its tags until the operation returns;
 *   a tag added after that throws, since no flush would ever post it;
 * - the **batch's own** (`batch.context()`), for work that cannot be cut into operations — a
 *   jobs run — whose tags are kept at once, so the caller flushes only once that work returned.
 *
 * Each tag carries whether `invalidate()` asked for immediate expiry (`now`, 5.3sold): a tag kept
 * more than once keeps `now` once any caller asked for it — over-invalidating a profile is safe,
 * under-invalidating one is not.
 */
import type { CacheTag } from './tags'

/** Payload's `req.context` (`RequestContext`): what a hook receives as `context`. */
export type RequestContext = { [key: string]: unknown }

/** The key a collecting context carries its collector under. */
export const COLLECTOR_KEY = '@engine/cache:collector'

/** A tag a collector holds, with whether it was asked to expire at once. */
export type TaggedEntry = { readonly tag: CacheTag; readonly now: boolean }

export type AddOptions = { readonly now?: boolean }

export abstract class Collector {
  abstract add(tags: readonly CacheTag[], options?: AddOptions): void
}

/** One operation's tags, open until the operation returns. */
export class OperationCollector extends Collector {
  readonly #tags = new Map<CacheTag, boolean>()
  #open = true

  add(tags: readonly CacheTag[], options?: AddOptions): void {
    if (!this.#open) {
      throw new Error(
        'invalidate(): its operation has already returned, so these tags would never be posted',
      )
    }
    const now = options?.now ?? false
    for (const tag of tags) this.#tags.set(tag, (this.#tags.get(tag) ?? false) || now)
  }

  close(): TaggedEntry[] {
    this.#open = false
    return [...this.#tags].map(([tag, now]) => ({ tag, now }))
  }
}

/** A batch's own collector: every tag is kept the moment a hook adds it. */
export class BatchCollector extends Collector {
  constructor(private readonly keep: (entries: readonly TaggedEntry[]) => void) {
    super()
  }

  add(tags: readonly CacheTag[], options?: AddOptions): void {
    const now = options?.now ?? false
    this.keep(tags.map((tag) => ({ tag, now })))
  }
}

/** The collector `context` carries, `null` when it carries none; throws on anything else there. */
export function collectorOf(
  context: Readonly<RequestContext> | null | undefined,
): Collector | null {
  if (!context || !Object.hasOwn(context, COLLECTOR_KEY)) return null
  const collector = context[COLLECTOR_KEY]
  if (!(collector instanceof Collector)) {
    throw new TypeError(`invalidate(): context.${COLLECTOR_KEY} is not an invalidation collector`)
  }
  return collector
}
