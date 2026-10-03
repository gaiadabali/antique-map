/**
 * Who may move an order from one status to another (COMMERCE.md §7; TASKS.md 3.5.c):
 *
 * - **store staff** (their own store's orders only — `./access` scopes which orders they reach):
 *   one step **forward** at a time along `paid → processing → waiting_driver → on_the_way →
 *   delivered`, never back, never to `cancelled`, never out of `pending_payment`;
 * - **the owner and editors**: any step forward along the same line, one step back to correct a
 *   mistake (`delivered → on_the_way` included — the one move out of a closed status), and
 *   `cancelled` from any status before `delivered`;
 * - **Midtrans and the sweep** — the server, signed in as nobody — `pending_payment → paid` or
 *   `expired`, and whatever else the order code does on the record: this rule judges only a move
 *   made by a signed-in member of staff.
 *
 * `on_the_way` needs the driver's details uploaded first (§9). A refusal is a `ValidationError`
 * on `status` with a plain sentence naming the move and what to do instead, so the admin, REST
 * and the Local API all show the same words (the 8.6 finding). Each move a person makes is
 * appended to the order's `history` with who and when, unless the caller recorded it itself.
 *
 * The compare-and-set on the current status, the stock release on a cancel and the notifications
 * are the order code's (phases 6–7).
 */
import { ValidationError, type CollectionBeforeChangeHook } from 'payload'

import { isStaffUser } from '../../access/roles'
import { roleOf, type UserRole } from '../users/roles'
import { ORDER_STATUS_LABELS, type OrderStatus } from './statuses'

/** The line an order moves along once paid, in order. */
export const FORWARD_LINE = [
  'paid',
  'processing',
  'waiting_driver',
  'on_the_way',
  'delivered',
] as const satisfies readonly OrderStatus[]

/** The statuses an owner or editor may cancel from: everything before delivery. */
const CANCELLABLE: readonly OrderStatus[] = [
  'pending_payment',
  'paid',
  'processing',
  'waiting_driver',
  'on_the_way',
]

const label = (status: OrderStatus) => ORDER_STATUS_LABELS[status].en
const place = (status: OrderStatus) => (FORWARD_LINE as readonly string[]).indexOf(status)

/**
 * Why `role` may not move an order from `from` to `to`, as a sentence for the person, or `null`
 * when the move is theirs to make. `hasDriverImage` says whether the driver's details are in.
 */
export function statusMoveRefusal(
  role: UserRole | null,
  from: OrderStatus,
  to: OrderStatus,
  hasDriverImage: boolean,
): string | null {
  if (from === to) return null
  const move = `“${label(from)}” to “${label(to)}”`
  if (role === null) return 'Only staff move an order.'
  const a = place(from)
  const b = place(to)
  if (role === 'store') {
    if (a === -1 || b !== a + 1) {
      const next = a === -1 || a === FORWARD_LINE.length - 1 ? null : FORWARD_LINE[a + 1]!
      return next === null
        ? `Store staff cannot move this order from ${move}. Hand it back with a reason if something is wrong.`
        : `Store staff move an order one step forward only: from “${label(from)}” the next step is “${label(next)}”. Hand it back with a reason if something is wrong.`
    }
  } else {
    const allowed =
      (to === 'cancelled' && CANCELLABLE.includes(from)) ||
      (a !== -1 && b !== -1 && (b > a || b === a - 1))
    if (!allowed) {
      return to === 'cancelled'
        ? `An order that is “${label(from)}” cannot be cancelled.`
        : `An order cannot move from ${move}. Move it forward, or one step back to correct a mistake.`
    }
  }
  if (to === 'on_the_way' && b > a && !hasDriverImage) {
    return 'Upload the driver’s details (a screenshot from Gojek or Grab) before marking the order on the way.'
  }
  return null
}

type OrderData = {
  id: number | string
  status?: unknown
  history?: unknown
  driverImage?: { key?: unknown } | null
}

const isStatus = (value: unknown): value is OrderStatus =>
  typeof value === 'string' && value in ORDER_STATUS_LABELS

/** `beforeChange` on `orders`: judges and records a status move made by a member of staff. */
export const guardStatusMove: CollectionBeforeChangeHook<OrderData> = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !isStaffUser(req.user)) return data
  const from = originalDoc?.status
  const to = 'status' in data ? data.status : from
  if (!isStatus(from) || !isStatus(to) || from === to) return data
  const image = (data.driverImage ?? originalDoc?.driverImage)?.key
  const refusal = statusMoveRefusal(
    roleOf(req.user),
    from,
    to,
    typeof image === 'string' && image !== '',
  )
  if (refusal !== null) {
    throw new ValidationError(
      {
        collection: 'orders',
        ...(originalDoc === undefined ? {} : { id: originalDoc.id }),
        errors: [{ path: 'status', message: refusal }],
        req,
      },
      req.t,
    )
  }
  const before = Array.isArray(originalDoc?.history) ? originalDoc.history : []
  const sent = Array.isArray(data.history) ? data.history : before
  if (sent.length > before.length) return data // the order code recorded the move itself
  const by = req.user?.id
  const row = { from, to, at: new Date().toISOString(), actor: 'user', by: by ?? null }
  return { ...data, history: [...sent, row] }
}
