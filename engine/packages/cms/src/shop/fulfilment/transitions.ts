/**
 * Whether one status move is this actor's to make (COMMERCE.md §7; TASKS.md 7.1.a) — pure, so the
 * whole table is unit-tested. The machine itself is the collection's (`collections/orders/
 * status-moves` `statusMoveRefusal`, 3.5.c), which the admin's own writes are judged by too; this
 * adds what only the order code knows — whose store the order is, and whether the move needs the
 * driver's details first — and turns the answer into a refusal code.
 *
 * - **Store staff**: their own store's orders only; one step forward along `paid → processing →
 *   waiting_driver → on_the_way → delivered`; never back, never a skip, never `cancelled`.
 * - **Owner and editors**: any order; any step forward, one step back to correct a mistake, and
 *   `cancelled` from anything before `delivered`.
 * - **`on_the_way`** needs the driver's details uploaded (§9), whoever moves it.
 */
import { statusMoveRefusal } from '../../collections/orders/status-moves'
import { HOLDING_STATUSES, type OrderStatus } from '../../collections/orders/statuses'
import type { UserRole } from '../../collections/users/roles'
import type { MoveRefusal } from './types'

export type MoveJudgement =
  | { readonly ok: true; readonly returnsStock: boolean }
  | { readonly ok: false; readonly refusal: MoveRefusal; readonly message: string }

export type MoveQuestion = {
  /** The actor's role, or null for anyone who is not a member of staff. */
  readonly role: UserRole | null
  /** A store user's store; null for everyone else. */
  readonly actorStore: number | null
  readonly orderStore: number
  readonly from: OrderStatus
  readonly to: OrderStatus
  readonly hasDriverImage: boolean
}

const refuse = (refusal: MoveRefusal, message: string): MoveJudgement => ({
  ok: false,
  refusal,
  message,
})

/** True when leaving `from` for `to` puts the order's units back on its store's shelf. */
export function returnsStock(from: OrderStatus, to: OrderStatus): boolean {
  return to === 'cancelled' && (HOLDING_STATUSES as readonly OrderStatus[]).includes(from)
}

export function judgeMove(question: MoveQuestion): MoveJudgement {
  const { role, from, to } = question
  if (role === null) return refuse('not_staff', 'Only staff move an order.')
  if (role === 'store' && question.actorStore !== question.orderStore) {
    return refuse('not_your_store', 'This order belongs to another store.')
  }
  if (from === to) return refuse('no_change', 'The order is already in that status.')
  // Judged as if the image were in, so a missing image is its own refusal, not the machine's.
  const machine = statusMoveRefusal(role, from, to, true)
  if (machine !== null) return refuse('move_not_allowed', machine)
  const imageNeeded = statusMoveRefusal(role, from, to, question.hasDriverImage)
  if (imageNeeded !== null) return refuse('driver_image_required', imageNeeded)
  return { ok: true, returnsStock: returnsStock(from, to) }
}
