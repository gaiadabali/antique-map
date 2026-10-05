import type { Payload } from 'payload'

import type { AttachInput, AttachResult, PurgeRun } from './types'

/** The largest upload accepted: 10 MB (COMMERCE.md §9; SECURITY.md F2). */
export const DRIVER_IMAGE_MAX_BYTES = 10 * 1024 * 1024
/** The stored image's longest edge, px (COMMERCE.md §9). */
export const DRIVER_IMAGE_MAX_EDGE = 1600
/** Days after delivery or cancellation the image is kept (COMPLIANCE.md §1). */
export const DRIVER_IMAGE_RETENTION_DAYS = 30

/**
 * Stores the driver's details for an order: type sniffed from the bytes, size-limited, re-encoded
 * (metadata stripped, at most 1600 px) and put in the private bucket under `orders/{id}/`.
 */
export async function attachDriverImage(
  payload: Payload,
  input: AttachInput,
): Promise<AttachResult> {
  void payload
  void input
  throw new Error('fulfilment: attachDriverImage is not built yet (7.1 step 2)')
}

/** A presigned GET for the order's driver image, valid `ttlSeconds`; null when there is none. */
export async function driverImageUrl(
  payload: Payload,
  orderId: number,
  ttlSeconds: number,
): Promise<string | null> {
  void payload
  void orderId
  void ttlSeconds
  throw new Error('fulfilment: driverImageUrl is not built yet (7.1 step 2)')
}

/** Deletes driver images 30 days after their order was delivered or cancelled. */
export async function purgeDriverImages(payload: Payload, now: Date): Promise<PurgeRun> {
  void payload
  void now
  throw new Error('fulfilment: purgeDriverImages is not built yet (7.1 step 2)')
}
