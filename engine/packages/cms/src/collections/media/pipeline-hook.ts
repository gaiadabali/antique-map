/**
 * When the media pipeline runs (`./pipeline`; TASKS.md 5.2): after an upload — a new record's
 * file, or a replacement — once the response has gone and the write has committed.
 *
 * **Why not inside the save, and why not (yet) a queued job.** Rendering ten AVIF/WebP rungs and a
 * pyramid of a large sheet takes seconds to tens of seconds of CPU: inside `afterChange` it would
 * hold the upload's response and its database transaction open that long, and a failure there
 * would fail the upload. ARCHITECTURE.md §10 puts derivatives and tiles on the jobs queue, run by
 * `/api/x/cron/jobs` — but Payload adds the queue's `payload_jobs` table only with the first
 * registered task, and no migration carries it yet, so registering one now would need a schema
 * change this task may not make. Until then:
 *
 * - **Inside a Next request** (the admin's upload, REST): `after()` runs it once the response is
 *   sent — after Payload's commit, so the run reads the committed record. Runs are serialised in
 *   the process, one image at a time, so a batch of uploads never stacks sharp's work on renders.
 * - **Outside one** (a seed, the importer, a script — whose `context` carries a cache collector,
 *   `@engine/cache`), or wherever `after()` refuses: nothing runs, the record stays `pending`, and
 *   `pnpm --filter @engine/cms media:derivatives` (`./derivatives-cli`) publishes it.
 *
 * The upload never waits for, or fails on, the pipeline: scheduling cannot throw.
 */
import { COLLECTOR_KEY } from '@engine/cache'
import { after } from 'next/server'
import type { CollectionAfterChangeHook, Payload } from 'payload'

import { deriveMedia, PIPELINE_CONTEXT_KEY } from './pipeline'

type Doc = Record<string, unknown> | null | undefined

/** Runs after the response; throws outside a request (Next's `after()`). */
export type Defer = (task: () => Promise<unknown>) => void
export type Run = (payload: Payload, id: number | string) => Promise<unknown>

let tail: Promise<unknown> = Promise.resolve()

/** One pipeline run at a time in this process, in the order they were scheduled. */
export function serially<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task)
  tail = run.catch(() => undefined)
  return run
}

let toldPending = false
function leavePending(payload: Payload, why: string): void {
  if (toldPending) return
  toldPending = true
  payload.logger.info({
    msg: `media pipeline: ${why}; new images stay pending until \`pnpm --filter @engine/cms media:derivatives\` runs`,
  })
}

/** Whether this write brought a file: a create with one, or a replacement. */
function broughtAFile(doc: Doc, previousDoc: Doc, hasFile: boolean): boolean {
  const assetId = doc?.assetId
  if (typeof assetId !== 'string' || assetId === '') return false
  return hasFile || assetId !== previousDoc?.assetId
}

export function derivativesAfterUploadWith(defer: Defer, run: Run): CollectionAfterChangeHook {
  return ({ doc, previousDoc, req, context }) => {
    if (context?.[PIPELINE_CONTEXT_KEY]) return doc
    if (!broughtAFile(doc as Doc, previousDoc as Doc, Boolean(req.file))) return doc
    const { payload } = req
    if (context && COLLECTOR_KEY in context) {
      leavePending(payload, 'running outside a request')
      return doc
    }
    const id = (doc as { id: number | string }).id
    try {
      defer(() => serially(() => run(payload, id)))
    } catch {
      leavePending(payload, 'no request to run after')
    }
    return doc
  }
}

export const derivativesAfterUpload: CollectionAfterChangeHook = derivativesAfterUploadWith(
  (task) => after(task),
  (payload, id) => deriveMedia(payload, id),
)
