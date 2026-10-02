/**
 * An order's statuses (COMMERCE.md §7), in the order an order moves through them, and which of
 * them hold stock on the store's shelf. Who may move an order between them, and the stock release
 * that goes with a move, are phases 6–7 and TASKS.md 3.5.c; this file is the vocabulary only.
 */

export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'processing',
  'waiting_driver',
  'on_the_way',
  'delivered',
  'cancelled',
  'expired',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/**
 * The statuses whose units are still on the store's shelf (COMMERCE.md §4; DATA.md §3): taken from
 * `stock-levels.quantity` when the order was created, not yet collected by a driver. A physical
 * count includes them, so the stored quantity is the count less these.
 */
export const HOLDING_STATUSES = [
  'pending_payment',
  'paid',
  'processing',
  'waiting_driver',
] as const satisfies readonly OrderStatus[]

export const ORDER_STATUS_LABELS: Record<OrderStatus, { en: string; id: string }> = {
  pending_payment: { en: 'Awaiting payment', id: 'Menunggu pembayaran' },
  paid: { en: 'Paid', id: 'Dibayar' },
  processing: { en: 'Processing', id: 'Diproses' },
  waiting_driver: { en: 'Waiting for driver', id: 'Menunggu pengemudi' },
  on_the_way: { en: 'On the way', id: 'Dalam perjalanan' },
  delivered: { en: 'Delivered', id: 'Terkirim' },
  cancelled: { en: 'Cancelled', id: 'Dibatalkan' },
  expired: { en: 'Expired', id: 'Kedaluwarsa' },
}

export const ORDER_STATUS_OPTIONS = ORDER_STATUSES.map((value) => ({
  value,
  label: ORDER_STATUS_LABELS[value],
}))
