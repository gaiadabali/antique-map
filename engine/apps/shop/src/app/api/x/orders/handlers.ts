/**
 * The store panel's and the owner's order actions (TASKS.md 6.6.c, 7.2) on this app's own CMS:
 * `@engine/cms-shop`'s handlers, bound to its Payload. Each `orders/**` route re-exports one.
 */
import { staffOrderRoutes } from '@engine/cms-shop/fulfilment/staff-routes'

export const {
  ordersQuotePost,
  ordersMovePost,
  ordersDriverImagePost,
  ordersHandBackPost,
  ordersReassignPost,
} = staffOrderRoutes()
