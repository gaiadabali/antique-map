/**
 * The fulfilment core's vocabulary (TASKS.md 7.1; COMMERCE.md §4, §7, §9): who acts, and what each
 * action answers. Every answer is a discriminated union on `ok`; a refusal carries a `refusal`
 * code the store panel's lexicon maps (7.2) and a plain English `message` for logs and the admin.
 * Nothing here is thrown for a person's mistake — only a defect throws.
 */
import type { OrderStatus } from '../../collections/orders/statuses'

/**
 * Who acts: the signed-in `req.user` as Payload gives it — a `users` document carrying
 * `collection: 'users'`, its `role` and (for store staff) its `store`. Anyone else — a buyer, an
 * API key of another collection, nobody — is refused every action.
 */
export type FulfilmentActor =
  | {
      readonly id: number | string
      readonly collection?: unknown
      readonly role?: unknown
      readonly store?: unknown
    }
  | null
  | undefined

/** A product line named without its quantity, as the checkout names them (`../orders`). */
export type FulfilmentLineRef = { readonly productId: number; readonly variantSku: string | null }

// ── moveOrder ────────────────────────────────────────────────────────────────────────────────

export type MoveInput = {
  readonly orderId: number
  readonly to: OrderStatus
  readonly actor: FulfilmentActor
  /** Kept on the history row (at most 500 characters); a cancel should say why. */
  readonly reason?: string
  readonly now?: Date
}

export type MoveRefusal =
  /** Not a member of staff with a known role. */
  | 'not_staff'
  | 'not_found'
  /** Store staff, and the order is another store's. */
  | 'not_your_store'
  /** The order is already in that status. */
  | 'no_change'
  /** The machine forbids this move for this role (backward, a skip, out of a closed status…). */
  | 'move_not_allowed'
  /** `on_the_way` before the driver's details are uploaded. */
  | 'driver_image_required'

export type MoveResult =
  | {
      readonly ok: true
      readonly orderId: number
      readonly from: OrderStatus
      readonly to: OrderStatus
      /** True when the move was a cancel from a holding status and the units went back on the shelf. */
      readonly stockReturned: boolean
    }
  | { readonly ok: false; readonly refusal: MoveRefusal; readonly message: string }

// ── the driver's details ─────────────────────────────────────────────────────────────────────

/** The uploaded file as the route read it. Only `buffer` is trusted; `mimetype` is ignored. */
export type DriverImageFile = {
  readonly buffer: Uint8Array
  readonly mimetype?: string
  readonly size?: number
}

export type AttachInput = {
  readonly orderId: number
  readonly file: DriverImageFile
  readonly actor: FulfilmentActor
  readonly now?: Date
}

export type AttachRefusal =
  | 'not_staff'
  | 'not_found'
  | 'not_your_store'
  /** The order is not between `paid` and `on_the_way`: there is no driver to show. */
  | 'order_closed'
  | 'empty_file'
  /** Over `DRIVER_IMAGE_MAX_BYTES`. */
  | 'too_large'
  /** The bytes are not a JPEG, PNG or WebP, whatever the name or header said. */
  | 'not_an_image'
  /** The bytes start like an image but do not decode. */
  | 'unreadable_image'
  /** The private bucket is not configured on this server. */
  | 'storage_unavailable'

export type AttachResult =
  | {
      readonly ok: true
      readonly orderId: number
      /** The private bucket's key, `orders/{id}/…`. Never a public URL: see `driverImageUrl`. */
      readonly key: string
      readonly contentType: string
      readonly width: number
      readonly height: number
    }
  | { readonly ok: false; readonly refusal: AttachRefusal; readonly message: string }

export type PurgeRun = { readonly purged: number; readonly failed: number }

// ── reassigning and handing back ─────────────────────────────────────────────────────────────

export type ReassignInput = {
  readonly orderId: number
  readonly toStoreId: number
  readonly actor: FulfilmentActor
  readonly now?: Date
}

export type ReassignRefusal =
  /** Only the owner and editors reassign. */
  | 'not_allowed'
  | 'not_found'
  /** Only a `paid` or `processing` order is reassigned (COMMERCE.md §4). */
  | 'wrong_status'
  /** The order is already at that store — a concurrent reassign got there first, perhaps. */
  | 'same_store'
  /** The store does not exist, is not active, or has no pin. */
  | 'store_unavailable'
  /** The store cannot fill every line; nothing changed. */
  | 'not_enough_stock'

export type ReassignResult =
  | {
      readonly ok: true
      readonly orderId: number
      readonly fromStoreId: number
      readonly toStoreId: number
      readonly distanceKm: number
    }
  | {
      readonly ok: false
      readonly refusal: Exclude<ReassignRefusal, 'not_enough_stock'>
      readonly message: string
    }
  | {
      readonly ok: false
      readonly refusal: 'not_enough_stock'
      readonly message: string
      /** The lines the store cannot fill — products and variants only, never its counts. */
      readonly lines: readonly FulfilmentLineRef[]
    }

export type HandBackInput = {
  readonly orderId: number
  readonly actor: FulfilmentActor
  readonly reason: string
  readonly now?: Date
}

export type HandBackRefusal =
  /** Only store staff hand an order back; the owner and editors reassign or cancel it. */
  | 'not_allowed'
  | 'not_found'
  | 'not_your_store'
  /** Only before a driver collects it: `paid`, `processing` or `waiting_driver`. */
  | 'wrong_status'
  | 'reason_required'

export type HandBackResult =
  | { readonly ok: true; readonly orderId: number }
  | { readonly ok: false; readonly refusal: HandBackRefusal; readonly message: string }
