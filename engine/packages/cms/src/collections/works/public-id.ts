/**
 * `works.publicId` (TASKS.md 3.2.b; CONTENT-MODEL.md §3; DATA.md §3): the integer that part of
 * the item's address `/product/{publicId}-{slug}` carries. Made once, never changed:
 *
 * - **On create** it is the next number — `max(publicId)+1`, never below the floor
 *   (`nextPublicId`) — taken under the same exclusive lock the uid takes, in the operation's
 *   transaction, so two works saved at once never share one. A person never chooses it: the
 *   admin's duplicate included (`beforeDuplicate` clears it, `./fields-record`).
 * - **A migrated work keeps the old site's id**: a script on the Local API (the migration
 *   importer) may hand one over, as it may a `workUid`.
 * - **On update** any change to it is refused, by any API.
 */
import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { asLabel } from '../../hooks/work-facts'
import {
  lockForTransaction,
  queryInTransaction,
  WORK_UID_LOCK_KEY,
} from '../../hooks/work-transaction'
import { nextPublicId } from '../../validators/work-record'
import { pickLanguage, type Bilingual } from '../products/money'

const WORKS = 'works'

function refuse(req: PayloadRequest, text: Bilingual): never {
  const message = pickLanguage(req, text)
  throw new ValidationError(
    {
      collection: WORKS,
      errors: [{ path: 'publicId', message, label: asLabel('Public id', message) }],
      req,
    },
    req.t,
  )
}

/** Whether this write is a script's — the Local API with no one signed in. */
const isScript = (req: PayloadRequest) => req.payloadAPI === 'local' && !req.user

/** The next public id, read under the uid's lock in this operation's transaction. */
export async function nextStoredPublicId(req: PayloadRequest): Promise<number> {
  const why = 'Numbering a new work'
  await lockForTransaction(req, WORK_UID_LOCK_KEY, { why })
  const rows = await queryInTransaction(
    req,
    'SELECT coalesce(max(public_id), 0) AS n FROM "works"',
    why,
  )
  return nextPublicId(Number(rows[0]?.n ?? 0))
}

export const assignPublicId: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const sent = (data as { publicId?: unknown }).publicId
  if (operation === 'update') {
    const stored = (originalDoc as { publicId?: unknown } | undefined)?.publicId
    if ('publicId' in data && sent !== stored && !(stored == null && sent == null)) {
      refuse(req, {
        en: 'A work keeps its public id for ever: its address points at it.',
        id: 'Id publik karya ini tidak pernah berubah: alamatnya mengarah ke situ.',
      })
    }
    return data
  }
  if (isScript(req) && sent !== null && sent !== undefined) {
    if (!Number.isSafeInteger(sent) || (sent as number) < 1) {
      refuse(req, {
        en: 'A public id is a whole number, 1 or more.',
        id: 'Id publik adalah bilangan bulat, 1 atau lebih.',
      })
    }
    return data
  }
  return { ...data, publicId: await nextStoredPublicId(req) }
}
