/**
 * `orders` — the shop's orders (CONTENT-MODEL.md §4; COMMERCE.md §8; TASKS.md 3.3.c). Schema and
 * access only: pricing, assignment, the atomic stock decrement, the status machine, payment,
 * notifications and the tracking page are phases 6–7.
 *
 * - **Fields**: what it was sold with (`./fields-sale`) and where it stands (`./fields-tracking`).
 * - **Who** (`./access`): nobody creates or deletes one through the API — the server's order code
 *   does, with access overridden; the owner and editors read and update every order, store staff
 *   their own store's, by a `Where` on `store`. What it was priced and sold with is the server's,
 *   field by field.
 * - **The database** refuses an order without a store, without a priced total, or with a total
 *   that is not `subtotal − discount + deliveryFee` (`./constraints`).
 *
 * Not yet here (phase 6–7 and the parallel 3.4 work): the `number` sequence (`orders_number_seq`,
 * a migration's — the order code takes `nextval` until then); a lead raised from an order's
 * WhatsApp chat (3.4's `leads`) points at the order from its side.
 */
import type { CollectionConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { dbConstraints } from '../../db/constraints'
import { ORDERS_ACCESS } from './access'
import { ORDER_CONSTRAINTS } from './constraints'
import { SALE_FIELDS } from './fields-sale'
import { TRACKING_FIELDS } from './fields-tracking'

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: {
    singular: { en: 'Order', id: 'Pesanan' },
    plural: { en: 'Orders', id: 'Pesanan' },
  },
  admin: {
    group: ADMIN_GROUPS.orders,
    useAsTitle: 'number',
    defaultColumns: ['number', 'status', 'store', 'createdAt'],
    description: {
      en: 'Orders from the shop. Store staff see their own store’s orders only.',
      id: 'Pesanan dari toko online. Staf toko hanya melihat pesanan tokonya sendiri.',
    },
  },
  access: ORDERS_ACCESS,
  custom: dbConstraints(...ORDER_CONSTRAINTS),
  fields: [...SALE_FIELDS, ...TRACKING_FIELDS],
}
