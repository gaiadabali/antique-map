/**
 * Invalidation outside a Next request (ARCHITECTURE.md §9): a `payload jobs:run` worker, a seed,
 * an import. The caller runs its writes through a batch, whose collector its hooks' `invalidate()`
 * finds on `req.context` (`./collector`), and flushes the batch — a post to `/api/x/revalidate` —
 * once those writes have returned, so once they have committed.
 *
 * ```ts
 * const batch = invalidationBatch()
 * for (const row of rows) {
 *   await batch.operation((context) => payload.update({ collection, id, data, context }))
 * }
 * await batch.flush() // an import: once per batch, not once per row
 *
 * // A jobs run, which cannot be cut into operations: the batch's own context on the run's req.
 * const req = await createLocalReq({ context: batch.context() }, payload)
 * await payload.jobs.run({ req })
 * await batch.flush() // only now: every job's writes have committed
 * ```
 *
 * **A thrown operation's tags are kept.** Over-invalidation on failure is by design: expiring a
 * tag whose content did not change costs one recompute, while dropping one whose content did
 * change leaves a stale page — under `'max'`, until the next edit. A throw does not prove that
 * nothing committed: a save with `disableTransaction`, a hook's nested write in its own
 * transaction and a unit that commits twice all commit before a later throw. The in-request mode
 * expires a rolled-back save's tags the same way.
 *
 * **A `req` goes in through `operation(write, { req })` only.** Payload merges a Local API call's
 * `context` into the `req` it is given and keeps it there, so a collector passed beside a `req`
 * would outlive its operation on that `req` — and on a jobs run's shared `req`, on every later
 * job's. `{ req }` puts the collector on the `req`'s context for the operation and takes it off
 * again, and refuses a `req` whose transaction is open: that commit is its caller's, after the
 * operation has returned, so the tags could be posted before it.
 */
import {
  BatchCollector,
  COLLECTOR_KEY,
  collectorOf,
  OperationCollector,
  type RequestContext,
} from './collector'
import { postTags, RevalidatePostError, type PostOptions, type RevalidateTarget } from './post'
import type { CacheTag } from './tags'
import { revalidateTargetFrom } from './target'

/** The part of Payload's `PayloadRequest` an operation reads: its context and its transaction. */
export type CollectingRequest = { context?: RequestContext; transactionID?: unknown }

export type OperationOptions = {
  /** A Local API `req` the write passes on, with no transaction open. */
  readonly req?: CollectingRequest
}

export type InvalidationBatch = {
  /**
   * Runs one write with a `context` to pass to Payload (a Local API call's `context` option, which
   * lands on `req.context`) — or, given `{ req }`, with its collector on that `req`'s context. Its
   * hooks' tags are kept once `write` has returned or thrown; a throw goes on to the caller.
   */
  operation<T>(
    write: (context: RequestContext) => Promise<T> | T,
    options?: OperationOptions,
  ): Promise<T>
  /**
   * The batch's own context, for work that cannot be cut into operations (a jobs run): every tag
   * its hooks add is kept at once, so flush only once that work has returned.
   */
  context(): RequestContext
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

/** Puts `collector` on `req.context` for `run`, then takes it off whatever context `req` has. */
async function onRequest<T>(
  req: CollectingRequest,
  collector: OperationCollector,
  run: (context: RequestContext) => Promise<T> | T,
): Promise<T> {
  if (req.transactionID !== undefined && req.transactionID !== null) {
    throw new TypeError(
      'operation(): this req has a transaction open, which commits after the operation returns — run the operation around the commit, or pass no req',
    )
  }
  if (collectorOf(req.context)) {
    throw new TypeError(
      'operation(): this req already carries a collector — for a jobs run, put batch.context() on its req',
    )
  }
  req.context = { ...req.context, [COLLECTOR_KEY]: collector }
  try {
    return await run(req.context)
  } finally {
    // Payload may have replaced req.context with a merged copy: clear whichever it holds now.
    if (req.context?.[COLLECTOR_KEY] === collector) delete req.context[COLLECTOR_KEY]
  }
}

export function invalidationBatch(options: BatchOptions = {}): InvalidationBatch {
  // Each kept tag with when it was last kept: a tag kept again while a flush that holds it is in
  // flight — a write committed after that post may have been served — stays for the next one.
  const kept = new Map<CacheTag, number>()
  let generation = 0
  let queue: Promise<unknown> = Promise.resolve()

  const keep = (tags: readonly CacheTag[]) => {
    for (const tag of tags) {
      kept.delete(tag)
      kept.set(tag, ++generation)
    }
  }
  const own = new BatchCollector(keep)

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
    async operation(write, { req } = {}) {
      const collector = new OperationCollector()
      try {
        return req
          ? await onRequest(req, collector, write)
          : await write({ [COLLECTOR_KEY]: collector })
      } finally {
        keep(collector.close())
      }
    },
    context() {
      return { [COLLECTOR_KEY]: own }
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
