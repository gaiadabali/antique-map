/**
 * The pictures' web sizes for every media record not yet `ready` (the derivative pipeline,
 * `../collections/media/pipeline`): what `pnpm --filter @engine/cms media:derivatives` does for
 * the whole table, kept to the pending ones so the admin's seed button can run it after a seed
 * without re-encoding every picture.
 */
import type { Payload, RequestContext } from 'payload'

import { deriveMedia } from '../collections/media/pipeline'

export type DerivativesReport = {
  readonly targets: number
  readonly counts: Record<string, number>
}

export async function derivePending(
  payload: Payload,
  context?: RequestContext,
): Promise<DerivativesReport> {
  const { docs } = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    sort: 'id',
    where: { 'derivatives.status': { not_equals: 'ready' } },
    select: { id: true },
  })
  const counts: Record<string, number> = {}
  for (const doc of docs) {
    const outcome = await deriveMedia(payload, doc.id as number, { context })
    const key = outcome.status === 'skipped' ? `skipped (${outcome.reason})` : outcome.status
    counts[key] = (counts[key] ?? 0) + 1
  }
  return { targets: docs.length, counts }
}

/** One line for a run's report: `pictures: 3 record(s): 3 ready`. */
export function renderDerivatives(report: DerivativesReport): string {
  const summary = Object.entries(report.counts)
    .map(([status, n]) => `${n} ${status}`)
    .join(', ')
  return `pictures: ${report.targets} record(s) needed web sizes: ${summary || 'none'}`
}
