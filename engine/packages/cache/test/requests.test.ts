/**
 * A `req` in an out-of-request batch (the independent senior-db review of 4.8, S2): an operation
 * refuses a `req` whose transaction is open and leaves no collector on a `req`'s context after it
 * returns; a jobs run, which cannot be cut into operations, carries the batch's own context. The
 * stand-ins below behave as Payload 3.90.2 does — `createLocalReq()` merging `context` into
 * `req.context`, a job's `req` a proxy writing every key but `transactionID` to the run's `req` —
 * and `instance.db.test.ts` runs the same against real Payload.
 */
import { describe, expect, it } from 'vitest'

import {
  COLLECTOR_KEY,
  invalidate,
  invalidationBatch,
  itemTag,
  type CollectingRequest,
  type RequestContext,
} from '../src/index'

const target = { origin: 'http://127.0.0.1:1', secret: 's' }
const batchOf = () =>
  invalidationBatch({
    target,
    fetch: (async () => new Response(null, { status: 204 })) as typeof fetch,
  })

/** `payload.create({ req, context })` as it treats the two: the call's context merged into req's. */
async function save(
  req: CollectingRequest,
  tag: ReturnType<typeof itemTag>,
  context?: RequestContext,
) {
  if (context) req.context = { ...req.context, ...context }
  await Promise.resolve()
  invalidate([tag], req.context)
}

describe('operation(write, { req })', () => {
  it("puts its collector on the req's context for the write, and takes it off again", async () => {
    const batch = batchOf()
    const req: CollectingRequest = { context: { locale: 'en' } }
    await batch.operation(() => save(req, itemTag(1)), { req })
    expect(batch.pending).toEqual(['item:1'])
    expect(req.context).toEqual({ locale: 'en' })
    // The req goes on to a later write, with a collector of its own.
    await batch.operation(() => save(req, itemTag(2)), { req })
    expect(batch.pending).toEqual(['item:1', 'item:2'])
  })

  it('takes it off the merged copy Payload leaves on the req, and after a throw', async () => {
    const batch = batchOf()
    const req: CollectingRequest = {}
    await expect(
      batch.operation(
        async (context) => {
          await save(req, itemTag(3), { ...context, depth: 0 })
          throw new Error('a later hook failed')
        },
        { req },
      ),
    ).rejects.toThrow('a later hook failed')
    expect(batch.pending).toEqual(['item:3'])
    expect(Object.hasOwn(req.context ?? {}, COLLECTOR_KEY)).toBe(false)
  })

  it('refuses a req whose transaction is open: its commit comes after the operation returns', async () => {
    const batch = batchOf()
    for (const transactionID of ['a1b2', 7, Promise.resolve('a1b2')]) {
      let ran = false
      const req: CollectingRequest = { context: {}, transactionID }
      await expect(
        batch.operation(
          () => {
            ran = true
          },
          { req },
        ),
      ).rejects.toThrow(/this req has a transaction open/)
      expect(ran).toBe(false)
      expect(req.context).toEqual({})
    }
    expect(batch.pending).toEqual([])
  })

  it('refuses a req that already carries a collector', async () => {
    const batch = batchOf()
    const req: CollectingRequest = { context: batch.context() }
    await expect(batch.operation(() => undefined, { req })).rejects.toThrow(
      /already carries a collector/,
    )
  })
})

describe('batch.context(): a jobs run', () => {
  /** runJobs' `isolateObjectProperty(req, 'transactionID')`: every other key lands on `run`. */
  const jobReq = (run: CollectingRequest): CollectingRequest => {
    let transactionID: unknown
    return new Proxy(run, {
      get: (target, key) => (key === 'transactionID' ? transactionID : Reflect.get(target, key)),
      set: (target, key, value) =>
        key === 'transactionID' ? ((transactionID = value), true) : Reflect.set(target, key, value),
    })
  }

  it('keeps every tag at once, for a flush once the run has returned', async () => {
    const batch = batchOf()
    const run: CollectingRequest = { context: batch.context() }
    await Promise.all([save(jobReq(run), itemTag(10)), save(jobReq(run), itemTag(11))])
    expect(batch.pending).toEqual(['item:10', 'item:11'])
  })

  it('survives Payload merging a job call’s context into the shared req, and never closes', async () => {
    const batch = batchOf()
    const run: CollectingRequest = { context: batch.context() }
    await save(jobReq(run), itemTag(12), { depth: 0 })
    await batch.flush()
    await save(jobReq(run), itemTag(13))
    expect(batch.pending).toEqual(['item:13'])
  })
})
