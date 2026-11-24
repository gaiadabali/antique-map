/**
 * Every collection in the shop's CMS (PLAN-V2 §4.1; CONTENT-MODEL.md §2): the shop's own —
 * products, categories, themes, discounts, stores, stock levels, orders, order notifications,
 * partners, payment events, its pages and articles — and the shared ones from `@engine/cms-core`
 * (`./shared`). The sidebar's order is the plan's (`../admin/nav-plan.ts`), not this one.
 *
 * Today's one CMS (`@engine/cms`) lists the shop's collections from the same modules, built with its
 * own `site` and the gallery's `relatedWork` where the factories take them.
 */
import type { CollectionConfig } from 'payload'

import { Articles } from './articles'
import { Categories } from './categories'
import { Discounts } from './discounts'
import { OrderNotifications } from './order-notifications'
import { Orders } from './orders'
import { Pages } from './pages'
import { Partners } from './partners'
import { PaymentEvents } from './payment-events'
import { Products } from './products'
import { ChatSessions, Events, Leads, Media, Redirects, Users } from './shared'
import { StockLevels } from './stock-levels'
import { Stores } from './stores'
import { Themes } from './themes'

export const SHOP_COLLECTIONS: readonly CollectionConfig[] = [
  Products,
  Categories,
  Themes,
  Discounts,
  Stores,
  StockLevels,
  Orders,
  OrderNotifications,
  Leads,
  Partners,
  ChatSessions,
  Media,
  Pages,
  Articles,
  Redirects,
  Users,
  Events,
  PaymentEvents,
]

export { Articles } from './articles'
export { Categories } from './categories'
export { Discounts } from './discounts'
export { OrderNotifications } from './order-notifications'
export { Orders, ordersCollection, type OrdersOptions } from './orders'
export { SERVER_ONLY as ORDER_SERVER_ONLY } from './orders/access'
export { PAGES_ACCESS, Pages, shopPageLayout } from './pages'
export { Partners, partnersCollection, type PartnersOptions } from './partners'
export { PaymentEvents } from './payment-events'
export { Products, productsCollection } from './products'
export { originalStockNumber, type ProductFieldOptions } from './products/fields'
export { StockLevels } from './stock-levels'
export { Stores } from './stores'
export { STORE_REGION_LABELS, STORE_REGIONS, type StoreRegion } from './stores/stores-page'
export { Themes } from './themes'
export {
  PARTNERSHIP_TYPE_LABELS,
  PARTNERSHIP_TYPES,
  partnershipTypeField,
  type PartnershipType,
} from './leads/partnership-type'
