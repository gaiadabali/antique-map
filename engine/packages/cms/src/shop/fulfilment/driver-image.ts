/**
 * The driver's details (COMMERCE.md §9; SECURITY.md F1–F5; TASKS.md 7.1.b): a screenshot from Gojek
 * or Grab that store staff upload when a driver accepts the job, which the buyer then sees on the
 * tracking page.
 *
 * `attachDriverImage`, in order — the cheap refusals before any decoding, the decoding outside any
 * lock, the record in one transaction:
 * 1. a member of staff; the bytes' size and type (`./image`) — nothing trusted from the request;
 * 2. the order, theirs to reach, between `paid` and `on_the_way`;
 * 3. re-encoded (sharp: upright, metadata stripped, ≤ 1600 px, WebP) and put in the private prefix
 *    under a fresh key, `orders/{id}/{time}-{random}.webp`;
 * 4. one transaction: the order locked and checked again, `driverImage` pointed at the new key, a
 *    history row with who and when. If it refuses or fails, the new object is deleted again;
 * 5. after the commit, the image it replaced is deleted (the history keeps that there was one).
 *
 * `driverImageUrl` signs a GET for the current image only; whoever calls it has already decided
 * the viewer may see it (the admin's order access, the tracking page's token — SECURITY.md F5).
 * `purgeDriverImages` deletes every image of an order 30 days after it was delivered or cancelled.
 */
import { randomBytes } from 'node:crypto'

import type { Payload } from 'payload'

import { addHistory } from '../payments/order-sql'
import { inTransaction, sql, wholeOf } from '../payments/transaction'
import { reaches, staffOf, type Staff } from './actor'
import { checkUpload, reencodeImage, type Reencoder } from './image'
import {
  driverImageStoreFromEnv,
  orderImagePrefix,
  type DriverImageStoreSource,
} from './image-store'
import { addUserHistory, lockOrder, type LockedOrder } from './order-sql'
import type { AttachInput, AttachRefusal, AttachResult, PurgeRun } from './types'

/** The largest upload accepted: 10 MB (COMMERCE.md §9; SECURITY.md F2). */
export const DRIVER_IMAGE_MAX_BYTES = 10 * 1024 * 1024
/** The stored image's longest edge, px (COMMERCE.md §9). */
export const DRIVER_IMAGE_MAX_EDGE = 1600
/** Days after delivery or cancellation the image is kept (COMPLIANCE.md §1). */
export const DRIVER_IMAGE_RETENTION_DAYS = 30
/** The longest a signed URL may live: 15 minutes (`@engine/media` `PRESIGN_TTL_SECONDS.staffRead`). */
export const DRIVER_IMAGE_URL_MAX_TTL = 15 * 60
const PURGE_BATCH = 100

export type DriverImageDeps = {
  readonly store: DriverImageStoreSource
  readonly reencode: Reencoder
}
const DEFAULT_DEPS: DriverImageDeps = { store: driverImageStoreFromEnv, reencode: reencodeImage }

const MESSAGES: Record<AttachRefusal, string> = {
  not_staff: 'Only staff upload the driver’s details.',
  not_found: 'There is no such order.',
  not_your_store: 'This order belongs to another store.',
  order_closed: 'The driver’s details can be added only to a paid order not yet delivered.',
  empty_file: 'The file is empty.',
  too_large: 'The image is larger than 10 MB. Send a screenshot instead.',
  not_an_image: 'The file is not a JPEG, PNG or WebP image.',
  unreadable_image: 'The image could not be read. Take a new screenshot and try again.',
  storage_unavailable: 'Image storage is not configured on this server.',
}
const refuse = (refusal: AttachRefusal): AttachResult => ({
  ok: false,
  refusal,
  message: MESSAGES[refusal],
})

const ATTACHABLE: readonly string[] = ['paid', 'processing', 'waiting_driver', 'on_the_way']

/** Why `staff` may not attach to `order`, or null. */
function attachRefusal(staff: Staff, order: LockedOrder | null): AttachRefusal | null {
  if (order === null) return 'not_found'
  if (!reaches(staff, order.store)) return 'not_your_store'
  if (!ATTACHABLE.includes(order.status)) return 'order_closed'
  return null
}

/**
 * Stores the driver's details for an order: type sniffed from the bytes, size-limited, re-encoded
 * (metadata stripped, at most 1600 px) and put in the private bucket under `orders/{id}/`.
 */
export async function attachDriverImage(
  payload: Payload,
  input: AttachInput,
  deps: DriverImageDeps = DEFAULT_DEPS,
): Promise<AttachResult> {
  const staff = staffOf(input.actor)
  if (staff === null) return refuse('not_staff')
  const checked = checkUpload(input.file.buffer, DRIVER_IMAGE_MAX_BYTES)
  if (!checked.ok) return refuse(checked.refusal)
  const early = await inTransaction(payload, async (tx) =>
    attachRefusal(staff, await lockOrder(tx, input.orderId)),
  )
  if (early !== null) return refuse(early)
  const store = deps.store()
  if (store === null) return refuse('storage_unavailable')

  let image
  try {
    image = await deps.reencode(input.file.buffer, DRIVER_IMAGE_MAX_EDGE)
  } catch {
    return refuse('unreadable_image')
  }
  const at = input.now ?? new Date()
  const key = `${orderImagePrefix(input.orderId)}${at.getTime()}-${randomBytes(6).toString('hex')}.webp`
  await store.put(key, image.bytes, image.contentType)

  let recorded: { refusal: AttachRefusal } | { replaced: string | null }
  try {
    recorded = await inTransaction(payload, async (tx) => {
      const order = await lockOrder(tx, input.orderId)
      const refusal = attachRefusal(staff, order)
      if (refusal !== null || order === null) return { refusal: refusal ?? 'not_found' }
      await tx.rows(sql`
        UPDATE orders
           SET driver_image_key = ${key}, driver_image_content_type = ${image.contentType},
               driver_image_width = ${image.width}, driver_image_height = ${image.height},
               driver_image_uploaded_at = ${at}, driver_image_uploaded_by_id = ${staff.id},
               updated_at = ${at}
         WHERE id = ${order.id}`)
      await addUserHistory(tx, order.id, {
        from: order.status,
        to: order.status,
        at,
        by: staff.id,
        note:
          order.driverImageKey === null ? 'Driver’s details added.' : 'Driver’s details replaced.',
      })
      return { replaced: order.driverImageKey }
    })
  } catch (error) {
    await store.remove(key).catch(() => {})
    throw error
  }
  if ('refusal' in recorded) {
    await store.remove(key).catch(() => {})
    return refuse(recorded.refusal)
  }
  // The replaced image is no longer shown; a failed delete is caught by the purge's prefix sweep.
  if (recorded.replaced !== null) await store.remove(recorded.replaced).catch(() => {})
  return {
    ok: true,
    orderId: input.orderId,
    key,
    contentType: image.contentType,
    width: image.width,
    height: image.height,
  }
}

/**
 * A presigned GET for the order's current driver image, valid `ttlSeconds` (1 s – 15 min); null
 * when the order has none or no bucket is configured. The caller has already checked the viewer.
 */
export async function driverImageUrl(
  payload: Payload,
  orderId: number,
  ttlSeconds: number,
  deps: Pick<DriverImageDeps, 'store'> = DEFAULT_DEPS,
): Promise<string | null> {
  if (
    !Number.isSafeInteger(ttlSeconds) ||
    ttlSeconds < 1 ||
    ttlSeconds > DRIVER_IMAGE_URL_MAX_TTL
  ) {
    throw new RangeError(`a driver image URL lives 1–${DRIVER_IMAGE_URL_MAX_TTL} seconds`)
  }
  const [row] = await inTransaction(payload, (tx) =>
    tx.rows(sql`SELECT driver_image_key FROM orders WHERE id = ${orderId}`),
  )
  const key = row?.driver_image_key
  if (typeof key !== 'string' || key === '') return null
  const store = deps.store()
  return store === null ? null : store.presignGet(key, ttlSeconds)
}

/**
 * Deletes driver images 30 days after their order was delivered or cancelled (the last history
 * row into that status), at most 100 orders a run: every object under the order's prefix, then
 * the record's `driverImage`, by compare-and-set on the key, with a history note.
 */
export async function purgeDriverImages(
  payload: Payload,
  now: Date,
  deps: Pick<DriverImageDeps, 'store'> = DEFAULT_DEPS,
): Promise<PurgeRun> {
  const cutoff = new Date(now.getTime() - DRIVER_IMAGE_RETENTION_DAYS * 86_400_000)
  const due = await inTransaction(payload, (tx) =>
    tx.rows(sql`
      SELECT o.id, o.driver_image_key, o.status::text AS status FROM orders o
       WHERE o.driver_image_key IS NOT NULL AND o.status::text IN ('delivered', 'cancelled')
         AND (SELECT MAX(h.at) FROM orders_history h
               WHERE h._parent_id = o.id AND h."to"::text = o.status::text) < ${cutoff}
       ORDER BY o.id
       LIMIT ${PURGE_BATCH}`),
  )
  if (due.length === 0) return { purged: 0, failed: 0 }
  const store = deps.store()
  if (store === null) return { purged: 0, failed: due.length }

  let purged = 0
  let failed = 0
  for (const row of due) {
    const orderId = wholeOf(row.id, 'orders.id')
    const key = String(row.driver_image_key)
    try {
      for (const object of await store.list(orderImagePrefix(orderId))) await store.remove(object)
      await inTransaction(payload, async (tx) => {
        const cleared = await tx.rows(sql`
          UPDATE orders
             SET driver_image_key = NULL, driver_image_content_type = NULL,
                 driver_image_width = NULL, driver_image_height = NULL,
                 driver_image_uploaded_at = NULL, driver_image_uploaded_by_id = NULL,
                 updated_at = ${now}
           WHERE id = ${orderId} AND driver_image_key = ${key}
          RETURNING status::text AS status`)
        if (cleared.length === 0) return
        const status = String(cleared[0]!.status) as 'delivered' | 'cancelled'
        await addHistory(tx, orderId, {
          from: status,
          to: status,
          actor: 'system',
          at: now,
          note: `Driver’s details deleted ${DRIVER_IMAGE_RETENTION_DAYS} days after the order closed.`,
        })
      })
      purged += 1
    } catch {
      failed += 1
    }
  }
  return { purged, failed }
}
