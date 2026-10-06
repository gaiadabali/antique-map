/**
 * Deletes every row of a collection that matches a `where`, in pages, through the Local API. The
 * sweep runs as the server (the cron route's bearer is the access) on collections that are
 * owner-only to every visitor, so each call passes `overrideAccess: true`.
 *
 * Each round reads the first page of what still matches, then deletes exactly those ids: a row
 * another request changes meanwhile is simply no longer in the next read. A round that deletes
 * nothing ends the loop — a row that cannot be deleted must not spin the job — and a hard cap on
 * rounds bounds a run. Only a count comes back: no id, name or contact leaves this function.
 */
import type { Payload, Where } from 'payload'

export const RETENTION_BATCH = 100
/** At most this many pages a run; a backlog beyond it is taken by the next night's run. */
export const RETENTION_MAX_ROUNDS = 500

type Loose = (args: Record<string, unknown>) => Promise<unknown>

export async function deleteWhere(
  payload: Payload,
  collection: 'chat-sessions' | 'leads',
  where: Where,
): Promise<number> {
  const find = payload.find as unknown as Loose
  const remove = payload.delete as unknown as Loose
  let deleted = 0
  for (let round = 0; round < RETENTION_MAX_ROUNDS; round += 1) {
    const page = (await find.call(payload, {
      collection,
      where,
      limit: RETENTION_BATCH,
      page: 1,
      depth: 0,
      pagination: false,
      select: {},
      sort: 'id',
      overrideAccess: true,
    })) as { docs: Array<{ id: number | string }> }
    if (page.docs.length === 0) break
    const done = (await remove.call(payload, {
      collection,
      where: { id: { in: page.docs.map((doc) => doc.id) } },
      depth: 0,
      select: {},
      overrideAccess: true,
    })) as { docs?: unknown[] }
    const count = done.docs?.length ?? 0
    deleted += count
    if (count === 0) break
  }
  return deleted
}
