/**
 * `order-notifications` — the notifier's once-per-(order, status) claim (TASKS.md 6.6; COMMERCE.md
 * §11), moved off `orders` itself (6.6-core-r5): a field of `orders` cannot hold this claim, because
 * Payload's `update` writes back every field of the document it read — a writer that read the order
 * before another writer's claim committed overwrites that claim with its own stale copy, and the
 * second claim then wins too (a lost update, not a race the column's own locking can fix).
 *
 * One row per `(order, status)` ever sent, inserted with `INSERT … ON CONFLICT (order, status) DO
 * NOTHING RETURNING id` (`../../shop/notify`): a row back means this caller sends, no row means
 * someone already claimed it. Never touches the `orders` row, so claiming never waits on — or loses
 * to — a concurrent save of the order.
 *
 * No one reads, creates, updates or deletes a row through the API: the core inserts with raw SQL, on
 * the caller's open transaction when it has one, else as one autocommit statement. Hidden from the
 * admin nav — there is nothing here for a person to look at.
 */
import type { Access, CollectionConfig } from 'payload'

import { ORDER_STATUS_OPTIONS } from '../orders/statuses'

const nobody: Access = () => false

export const ORDER_NOTIFICATIONS_ACCESS = {
  read: nobody,
  create: nobody,
  update: nobody,
  delete: nobody,
} as const

export const OrderNotifications: CollectionConfig = {
  slug: 'order-notifications',
  labels: {
    singular: { en: 'Order notification', id: 'Notifikasi pesanan' },
    plural: { en: 'Order notifications', id: 'Notifikasi pesanan' },
  },
  admin: { hidden: true },
  access: ORDER_NOTIFICATIONS_ACCESS,
  indexes: [{ fields: ['order', 'status'], unique: true }],
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      label: { en: 'Order', id: 'Pesanan' },
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      label: { en: 'Status', id: 'Status' },
      options: ORDER_STATUS_OPTIONS,
      required: true,
    },
    {
      name: 'sentAt',
      type: 'date',
      label: { en: 'Sent at', id: 'Dikirim pada' },
    },
  ],
}
