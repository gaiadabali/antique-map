/**
 * `payment-events` — the Midtrans ledger (CONTENT-MODEL.md §4; COMMERCE.md §6; TASKS.md 3.3.c).
 * One row per distinct notification or status answer, keyed by `dedupeKey` (a hash of the
 * attempt's order id, transaction id, statuses and status code), inserted by the webhook, the
 * reconciler or the simulator in the transaction that applies it. The notification's body is never
 * stored or logged — only its SHA-256 (`payloadHash`).
 *
 * - **Append-only** (`./append-only`): nobody updates or deletes a row, by any path.
 * - **Read** by the owner alone (CONTENT-MODEL.md §7); written only by the server.
 * - **Unique `dedupeKey`**: the webhook's `INSERT … ON CONFLICT DO NOTHING` is its idempotency.
 * - `order` may be empty: a notification for an order we do not know is recorded too
 *   (`outcome: unknown-order`).
 */
import type { Access, CollectionConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { dbConstraints } from '../../db/constraints'
import { wholeCheck, wholeNumber } from '../products/money'
import { isOwner } from '../users/roles'
import { refuseUpdateAndDelete } from './append-only'

const nobody: Access = () => false

export const PAYMENT_EVENTS_ACCESS = {
  read: isOwner,
  create: nobody,
  update: nobody,
  delete: nobody,
} as const

export const PaymentEvents: CollectionConfig = {
  slug: 'payment-events',
  labels: {
    singular: { en: 'Payment event', id: 'Peristiwa pembayaran' },
    plural: { en: 'Payment events', id: 'Peristiwa pembayaran' },
  },
  admin: {
    group: ADMIN_GROUPS.orders,
    useAsTitle: 'dedupeKey',
    defaultColumns: ['receivedAt', 'order', 'transactionStatus', 'outcome', 'source'],
    description: {
      en: 'What the payment provider reported, in order. A record only: never edited.',
      id: 'Laporan penyedia pembayaran, berurutan. Hanya catatan: tidak pernah diubah.',
    },
  },
  access: PAYMENT_EVENTS_ACCESS,
  hooks: { beforeOperation: [refuseUpdateAndDelete] },
  custom: dbConstraints({
    table: 'payment_events',
    checks: {
      payment_events_gross_amount_whole: wholeCheck('gross_amount', 0),
      payment_events_dedupe_key_not_blank: `btrim(dedupe_key) <> ''`,
    },
  }),
  fields: [
    {
      name: 'provider',
      type: 'select',
      options: ['midtrans'],
      required: true,
      defaultValue: 'midtrans',
    },
    { name: 'dedupeKey', type: 'text', required: true, unique: true, maxLength: 128 },
    { name: 'order', type: 'relationship', relationTo: 'orders', index: true },
    { name: 'midtransOrderId', type: 'text', maxLength: 64 },
    { name: 'transactionStatus', type: 'text', maxLength: 40 },
    { name: 'fraudStatus', type: 'text', maxLength: 40 },
    { name: 'statusCode', type: 'text', maxLength: 8 },
    {
      name: 'grossAmount',
      type: 'number',
      validate: wholeNumber({ min: 0, what: 'The gross amount' }),
    },
    {
      name: 'source',
      type: 'select',
      options: ['webhook', 'reconcile', 'simulate'],
      required: true,
    },
    { name: 'outcome', type: 'text', maxLength: 40 },
    { name: 'payloadHash', type: 'text', maxLength: 64 },
    { name: 'receivedAt', type: 'date', required: true, index: true },
  ],
}
