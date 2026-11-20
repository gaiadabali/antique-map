/**
 * The store panel's and the owner's order actions (`src/app/api/x/orders/**`, TASKS.md 6.6.c, 7.2):
 * `@engine/cms-shop`'s handlers (moved there, TASKS.md 23.4) on this app's one CMS.
 */
import 'server-only'

import { staffOrderRoutes } from '@engine/cms-shop/fulfilment/staff-routes'
import { cms } from '@engine/cms/instance'

export const {
  ordersQuotePost,
  ordersMovePost,
  ordersDriverImagePost,
  ordersHandBackPost,
  ordersReassignPost,
} = staffOrderRoutes(cms)
