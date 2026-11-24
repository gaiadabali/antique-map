/**
 * Every collection and global in the one config (CONTENT-MODEL.md §2). The sidebar no longer
 * follows this order: it is laid out by `admin/nav/plan.ts` (TASKS.md 27.6.b). The shop's collections
 * are `@engine/cms-shop`'s, built here with this database's `site` and `relatedWork`
 * (`../collections/shop`); the others live in their own `collections/<slug>/index.ts`. A phase that adds one
 * (products, orders, leads… — TASKS.md phase 3) adds its folder and its line here. The old frozen
 * slug list, with its 31 empty stubs, is gone (TASKS.md 2.4.a): a slug exists when its collection
 * does. No global exists yet; `site-settings` is TASKS.md 3.4's.
 *
 * A collection or global with drafts must say who reads its drafts: `read` and `readVersions`
 * both set (`DRAFTED_ACCESS`), or the config refuses to build — Payload's fallback for an unset
 * `readVersions` is "any signed-in user", which would show a store user every draft through
 * `/versions`.
 */
import {
  assertDraftAccess,
  checkedCollections,
  checkedGlobals,
} from '@engine/cms-core/registries/checks'
import type { CollectionConfig, GlobalConfig } from 'payload'

import {
  Articles,
  Categories,
  Discounts,
  OrderNotifications,
  PaymentEvents,
  StockLevels,
  Stores,
  Themes,
} from '@engine/cms-shop/collections'
import { ShopFooter, ShopHeader } from '@engine/cms-shop/globals'

import { Orders, Partners, Products } from '../collections/shop'
import { ChatSessions } from '../collections/chat-sessions'
import { Events } from '../collections/events'
import { Leads } from '../collections/leads'
import { Makers } from '../collections/makers'
import { Masters } from '../collections/masters'
import { Media } from '../collections/media'
import { Pages } from '../collections/pages'
import { Places } from '../collections/places'
import { Redirects } from '../collections/redirects'
import { Terms } from '../collections/terms'
import { Users } from '../collections/users'
import { Works } from '../collections/works'
import { SiteSettings } from '../globals/site-settings'

/**
 * The collections, in the order the schema and the generated types have always listed them (the
 * sidebar's own order is `admin/nav/plan.ts`'s since TASKS.md 27.6.b).
 */
const COLLECTIONS: readonly CollectionConfig[] = [
  Works,
  Makers,
  Places,
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
  Terms,
  Media,
  Masters,
  Pages,
  Articles,
  Redirects,
  Users,
  Events,
  PaymentEvents,
]

const GLOBALS: readonly GlobalConfig[] = [SiteSettings, ShopHeader, ShopFooter]

export { assertDraftAccess }

/** Every collection, each checked for its draft access (`@engine/cms-core/registries/checks`). */
export function registeredCollections(
  collections: readonly CollectionConfig[] = COLLECTIONS,
): CollectionConfig[] {
  return checkedCollections(collections)
}

export function registeredGlobals(globals: readonly GlobalConfig[] = GLOBALS): GlobalConfig[] {
  return checkedGlobals(globals)
}
