/**
 * `orders` — the shop's orders (CONTENT-MODEL.md §4; COMMERCE.md §8; TASKS.md 3.3.c). Schema and
 * access only: pricing, assignment, the atomic stock decrement, the status machine, payment,
 * notifications and the tracking page are phases 6–7.
 *
 * - **Fields**: what it was sold with (`./fields-sale`) and where it stands (`./fields-tracking`).
 * - **Who** (`./access`): nobody creates or deletes one through the API — the server's order code
 *   does, with access overridden; the owner and editors read and update every order, store staff
 *   their own store's, by a `Where` on `store`. What it was priced and sold with is the server's,
 *   field by field. Who may move the status where — store staff one step forward — is
 *   `./status-moves`.
 * - **The database** refuses an order without a store, without a priced total, or with a total
 *   that is not `subtotal − discount + deliveryFee` (`./constraints`).
 *
 * - **Staff actions** beyond a status move (`./endpoints`, TASKS.md 10.7): Replace damaged item and
 *   clearing the flag, owner and editor only, carried out by the fulfilment core.
 *
 * The order number comes from `orders_number_seq` (from 100001, the wave migration's — the order
 * code takes `nextval`). Not yet here (phase 6–7): a lead raised from an order's
 * WhatsApp chat (3.4's `leads`) points at the order from its side.
 */
import { hiddenFromAllButAllStaff } from '@engine/cms-core/access'
import { dbConstraints } from '@engine/cms-core/db'
import type { CollectionConfig, Field } from 'payload'

import { ORDERS_ACCESS } from './access'
import { foldRarelyReadSections } from './collapse'
import { ORDER_CONSTRAINTS } from './constraints'
import { ORDER_ENDPOINTS } from './endpoints'
import { SALE_FIELDS } from './fields-sale'
import { TRACKING_FIELDS } from './fields-tracking'
import { notifyOnStatusChange } from './hooks/notify-on-status-change'
import { guardStatusMove } from './status-moves'

export type OrdersOptions = {
  /** Today's one CMS only: the order's `site` (always `shop`), after its number. */
  readonly site?: Field
}

/** The fields of the sale, with today's `site` after the number when one is given. */
const saleFields = (site?: Field): Field[] =>
  site ? [SALE_FIELDS[0]!, site, ...SALE_FIELDS.slice(1)] : SALE_FIELDS

export const ordersCollection = (options: OrdersOptions = {}): CollectionConfig => ({
  slug: 'orders',
  labels: {
    singular: { en: 'Order', id: 'Pesanan' },
    plural: { en: 'Orders', id: 'Pesanan' },
  },
  admin: {
    // Out of the sidebar (TASKS.md 27.3.a): staff's one door for orders is the orders inbox
    // (`admin/orders`, the sidebar's Orders link). `false` keeps every route, so the owner still
    // reaches the raw table at /admin/collections/orders by its address; access is unchanged.
    group: false,
    hidden: hiddenFromAllButAllStaff,
    useAsTitle: 'number',
    defaultColumns: ['number', 'status', 'store', 'createdAt'],
    description: {
      en: 'Orders from the shop. Store staff see their own store’s orders only.',
      id: 'Pesanan dari toko online. Staf toko hanya melihat pesanan tokonya sendiri.',
    },
  },
  access: ORDERS_ACCESS,
  endpoints: ORDER_ENDPOINTS,
  custom: dbConstraints(...ORDER_CONSTRAINTS),
  hooks: { beforeChange: [guardStatusMove], afterChange: [notifyOnStatusChange] },
  fields: foldRarelyReadSections([...saleFields(options.site), ...TRACKING_FIELDS]),
})

export const Orders = ordersCollection()
