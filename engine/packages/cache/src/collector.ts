/**
 * Invalidation outside a Next request (ARCHITECTURE.md §9): a `payload jobs:run` worker, a seed,
 * an import. There is no response for `after()` to follow, and Payload runs `afterChange` before
 * it commits, so a hook's `invalidate()` must not post on the spot: it hands its tags to the
 * collector its caller put on Payload's `req.context`, and the caller posts them — once its
 * operation has returned, which is once it has committed — by flushing the batch.
 *
 * ```ts
 * const batch = invalidationBatch()
 * for (const row of rows) {
 *   await batch.operation((context) => payload.update({ collection, id, data, context }))
 * }
 * await batch.flush() // an import: once per batch, not once per row
 * ```
 *
 * One `operation()` is one transaction: a Local API call that opens its own (Payload's default,
 * passed no `req` in a transaction), or a unit that commits its caller's transaction before it
 * returns. Its tags are kept when it resolves and dropped when it throws — a rolled-back save
 * changed nothing — so a unit that commits twice and then throws would drop the first commit's
 * tags: make it two operations. A tag a hook adds after its operation has returned throws.
 */
import {
  postTags,
  revalidateTargetFrom,
  RevalidatePostError,
  type PostOptions,
  type RevalidateTarget,
} from './post'
import type { CacheTag } from './tags'

/** Payload's `req.context` (`RequestContext`): what a hook receives as `context`. */
export type RequestContext = { [key: string]: unknown }

/** The key a collecting context carries its operation's stage under. */
export const COLLECTOR_KEY = '@engine/cache:collector'

/** One operation's tags, open until the operation returns. */
class Stage {
  readonly #tags = new Set<CacheTag>()
  #open = true

  add(tags: readonly CacheTag[]): void {
    if (!this.#open) {
      throw new Error(
        'invalidate(): its operation has already returned, so these tags would never be posted',
      )
    }
    for (const tag of tags) this.#tags.add(tag)
  }

  close(): CacheTag[] {
    this.#open = false
    return [...this.#tags]
  }
}

/** The stage `context` carries, `null` when it carries none; throws on anything else there. */
export function stageOf(context: Readonly<RequestContext> | null | undefined): Stage | null {
  if (!context || !Object.hasOwn(context, COLLECTOR_KEY)) return null
  const stage = context[COLLECTOR_KEY]
  if (!(stage instanceof Stage)) {
    throw new TypeError(`invalidate(): context.${COLLECTOR_KEY} is not an invalidation collector`)
  }
  return stage
}

export type InvalidationBatch = {
  /**
   * Runs one write with a `context` to pass to Payload (a Local API call's `context` option, which
   * lands on `req.context`). Its hooks' tags are kept once `write` resolves and dropped if it
   * throws; the throw goes on to the caller.
   */
  operation<T>(write: (context: RequestContext) => Promise<T> | T): Promise<T>
  /** The kept tags a flush would post, oldest first. */
  readonly pending: readonly CacheTag[]
  /**
   * Posts every kept tag to `/api/x/revalidate` (C13 `REVALIDATE_REQUEST`), in bodies the route
   * accepts, and resolves with how many it posted. Nothing else ever posts. A failure rejects
   * and keeps what the route had not accepted, so a retry — the outbox's — posts the rest.
   */
  flush(): Promise<number>
  /** Forgets every kept tag, posting none. */
  drop(): void
}

export type BatchOptions = PostOptions & {
  /** Where a flush posts; by default `revalidateTargetFrom()`, read when a flush has tags. */
  readonly target?: RevalidateTarget
}

export function invalidationBatch(options: BatchOptions = {}): InvalidationBatch {
  // Each kept tag with when it was last kept: a tag kept again while a flush that holds it is in
  // flight — a write committed after that post may have been served — stays for the next one.
  const kept = new Map<CacheTag, number>()
  let generation = 0
  let queue: Promise<unknown> = Promise.resolve()

  async function post(): Promise<number> {
    const sending = [...kept]
    if (sending.length === 0) return 0
    const target = options.target ?? revalidateTargetFrom()
    const forget = (count: number) => {
      for (const [tag, at] of sending.slice(0, count)) if (kept.get(tag) === at) kept.delete(tag)
    }
    try {
      const posted = await postTags(
        target,
        sending.map(([tag]) => tag),
        options,
      )
      forget(posted)
      return posted
    } catch (error) {
      if (error instanceof RevalidatePostError) forget(error.accepted)
      throw error
    }
  }

  return {
    async operation(write) {
      const stage = new Stage()
      let result
      try {
        result = await write({ [COLLECTOR_KEY]: stage })
      } catch (error) {
        stage.close()
        throw error
      }
      for (const tag of stage.close()) {
        kept.delete(tag)
        kept.set(tag, ++generation)
      }
      return result
    },
    get pending() {
      return [...kept.keys()]
    },
    flush() {
      const run = queue.then(post)
      queue = run.catch(() => undefined)
      return run
    },
    drop() {
      kept.clear()
    },
  }
}
