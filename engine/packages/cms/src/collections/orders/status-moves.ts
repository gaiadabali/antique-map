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
import { asLabel } from '../../hooks/work-facts'
import { type Bilingual, pickLanguage } from '../products/money'
import { roleOf, type UserRole } from '../users/roles'
import { ORDER_STATUS_LABELS, type OrderStatus } from './statuses'

type Language = 'en' | 'id'

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

const label = (status: OrderStatus, language: Language) => ORDER_STATUS_LABELS[status][language]
const place = (status: OrderStatus) => (FORWARD_LINE as readonly string[]).indexOf(status)
const move = (from: OrderStatus, to: OrderStatus, language: Language) =>
  language === 'id'
    ? `“${label(from, language)}” ke “${label(to, language)}”`
    : `“${label(from, language)}” to “${label(to, language)}”`

/**
 * Why `role` may not move an order from `from` to `to`, as a sentence for the person in both
 * admin languages, or `null` when the move is theirs to make. `hasDriverImage` says whether the
 * driver's details are in. The admin's `guardStatusMove` picks the admin's language from this;
 * `statusMoveRefusal` below keeps the English sentence for callers outside the admin (the order
 * code's `judgeMove`, `shop/fulfilment/transitions.ts`, 7.1.a — not this ticket's path).
 */
export function statusMoveRefusalBilingual(
  role: UserRole | null,
  from: OrderStatus,
  to: OrderStatus,
  hasDriverImage: boolean,
): Bilingual | null {
  if (from === to) return null
  if (role === null) {
    return { en: 'Only staff move an order.', id: 'Hanya staf yang dapat memindahkan pesanan.' }
  }
  const a = place(from)
  const b = place(to)
  if (role === 'store') {
    if (a === -1 || b !== a + 1) {
      const next = a === -1 || a === FORWARD_LINE.length - 1 ? null : FORWARD_LINE[a + 1]!
      if (next === null) {
        return {
          en: `Store staff cannot move this order from ${move(from, to, 'en')}. Hand it back with a reason if something is wrong.`,
          id: `Staf toko tidak dapat memindahkan pesanan ini dari ${move(from, to, 'id')}. Kembalikan dengan alasan jika ada yang salah.`,
        }
      }
      return {
        en: `Store staff move an order one step forward only: from “${label(from, 'en')}” the next step is “${label(next, 'en')}”. Hand it back with a reason if something is wrong.`,
        id: `Staf toko hanya memindahkan pesanan satu langkah maju: dari “${label(from, 'id')}” langkah berikutnya adalah “${label(next, 'id')}”. Kembalikan dengan alasan jika ada yang salah.`,
      }
    }
  } else {
    const allowed =
      (to === 'cancelled' && CANCELLABLE.includes(from)) ||
      (a !== -1 && b !== -1 && (b > a || b === a - 1))
    if (!allowed) {
      if (to === 'cancelled') {
        return {
          en: `An order that is “${label(from, 'en')}” cannot be cancelled.`,
          id: `Pesanan yang berstatus “${label(from, 'id')}” tidak dapat dibatalkan.`,
        }
      }
      return {
        en: `An order cannot move from ${move(from, to, 'en')}. Move it forward, or one step back to correct a mistake.`,
        id: `Pesanan tidak dapat dipindahkan dari ${move(from, to, 'id')}. Pindahkan maju, atau satu langkah mundur untuk memperbaiki kesalahan.`,
      }
    }
  }
  if (to === 'on_the_way' && b > a && !hasDriverImage) {
    return {
      en: 'Upload the driver’s details (a screenshot from Gojek or Grab) before marking the order on the way.',
      id: 'Unggah data pengemudi (tangkapan layar dari Gojek atau Grab) sebelum menandai pesanan sedang dalam perjalanan.',
    }
  }
  return null
}

/** The English sentence only, for callers outside the admin (the order code's `judgeMove`). */
export function statusMoveRefusal(
  role: UserRole | null,
  from: OrderStatus,
  to: OrderStatus,
  hasDriverImage: boolean,
): string | null {
  return statusMoveRefusalBilingual(role, from, to, hasDriverImage)?.en ?? null
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
  const refusal = statusMoveRefusalBilingual(
    roleOf(req.user),
    from,
    to,
    typeof image === 'string' && image !== '',
  )
  if (refusal !== null) {
    const message = pickLanguage(req, refusal)
    throw new ValidationError(
      {
        collection: 'orders',
        ...(originalDoc === undefined ? {} : { id: originalDoc.id }),
        errors: [{ path: 'status', message, label: asLabel('Status', message) }],
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
