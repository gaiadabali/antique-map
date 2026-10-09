/**
 * The shop's fulfilment core (TASKS.md 7.1; COMMERCE.md §4, §7, §9): moving an order through its
 * statuses, the driver's details, reassigning an order to another store, and a store handing one
 * back. The store panel (7.2) and the tracking page (7.3) use only what is exported here. Server
 * side only; every function takes the process's Payload and the signed-in `req.user` as `actor`,
 * and enforces who may do what itself — the UI hides buttons, it never decides.
 *
 *   // The store panel's big button, and the owner's status menu:
 *   const moved = await moveOrder(payload, { orderId, to: 'processing', actor: req.user })
 *   if (!moved.ok) …                  // moved.refusal → the lexicon; moved.message for logs
 *
 *   // POST /api/x/orders/{id}/driver-image — the route reads the multipart file, then:
 *   const attached = await attachDriverImage(payload, { orderId, file: { buffer, mimetype, size }, actor: req.user })
 *   // The admin and the tracking page (after checking the token) show it by a short-lived URL:
 *   const url = await driverImageUrl(payload, orderId, 300)        // null while there is none
 *
 *   // Owner or editor:
 *   const moved2 = await reassignOrder(payload, { orderId, toStoreId, actor: req.user })
 *   // Store staff:
 *   const handed = await handBackOrder(payload, { orderId, actor: req.user, reason })
 *
 *   // Owner or editor (TASKS.md 10.7): a Rp 0 replacement of a delivered order's damaged lines,
 *   // and clearing a flag once its reasons are dealt with — each with a required note:
 *   const replaced = await replaceDamagedItem(payload, { orderId, lines: [{ lineId, qty }], note, actor: req.user })
 *   const cleared = await clearOrderFlag(payload, { orderId, note, actor: req.user })
 *
 *   // The daily sweep (cron): images 30 days after delivery or cancellation are deleted.
 *   const run = await purgeDriverImages(payload, new Date())
 *
 * Rules every function keeps: one transaction, the order row locked (`FOR UPDATE`) and every
 * change a compare-and-set on what was locked; a `history` row for every change, with who, when
 * and why; stock moves only by the single-statement atomic `UPDATE … WHERE quantity >= n`, in the
 * lock order (product, variant SKU, store id) the order code and the expiry use.
 */
export { moveOrder } from './move'
export {
  DRIVER_IMAGE_MAX_BYTES,
  DRIVER_IMAGE_MAX_EDGE,
  DRIVER_IMAGE_RETENTION_DAYS,
  DRIVER_IMAGE_URL_MAX_TTL,
  attachDriverImage,
  driverImageUrl,
  purgeDriverImages,
  type DriverImageDeps,
} from './driver-image'
export { sniffImageType, type Reencoder } from './image'
export { driverImageStoreFromEnv, type DriverImageStore } from './image-store'
export { reassignOrder } from './reassign'
export { HAND_BACK_REASON_MAX, handBackOrder } from './hand-back'
export { replaceDamagedItem } from './replace'
export { clearOrderFlag } from './clear-flag'
export { STAFF_NOTE_MAX } from './types'
export { judgeMove, type MoveJudgement } from './transitions'
export type {
  AttachInput,
  AttachRefusal,
  AttachResult,
  ClearFlagInput,
  ClearFlagRefusal,
  ClearFlagResult,
  DriverImageFile,
  FulfilmentActor,
  FulfilmentLineRef,
  HandBackInput,
  HandBackRefusal,
  HandBackResult,
  MoveInput,
  MoveRefusal,
  MoveResult,
  PurgeRun,
  ReassignInput,
  ReassignRefusal,
  ReassignResult,
  ReplaceInput,
  ReplaceRefusal,
  ReplaceResult,
} from './types'
