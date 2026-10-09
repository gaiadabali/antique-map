/**
 * Every collection and global in the one config (CONTENT-MODEL.md §2), in the admin sidebar's
 * order. Each collection lives in its own `collections/<slug>/index.ts`; a phase that adds one
 * (products, orders, leads… — TASKS.md phase 3) adds its folder and its line here. The old frozen
 * slug list, with its 31 empty stubs, is gone (TASKS.md 2.4.a): a slug exists when its collection
 * does. No global exists yet; `site-settings` is TASKS.md 3.4's.
 *
 * A collection or global with drafts must say who reads its drafts: `read` and `readVersions`
 * both set (`DRAFTED_ACCESS`), or the config refuses to build — Payload's fallback for an unset
 * `readVersions` is "any signed-in user", which would show a store user every draft through
 * `/versions`.
 */
import type { CollectionConfig, GlobalConfig } from 'payload'

import { ChatSessions } from '../collections/chat-sessions'
import { Discounts } from '../collections/discounts'
import { Events } from '../collections/events'
import { Leads } from '../collections/leads'
import { Makers } from '../collections/makers'
import { Masters } from '../collections/masters'
import { Media } from '../collections/media'
import { OrderNotifications } from '../collections/order-notifications'
import { Orders } from '../collections/orders'
import { Pages } from '../collections/pages'
import { Partners } from '../collections/partners'
import { PaymentEvents } from '../collections/payment-events'
import { Places } from '../collections/places'
import { Products } from '../collections/products'
import { Redirects } from '../collections/redirects'
import { StockLevels } from '../collections/stock-levels'
import { Stores } from '../collections/stores'
import { Terms } from '../collections/terms'
import { Users } from '../collections/users'
import { Works } from '../collections/works'
import { SiteSettings } from '../globals/site-settings'

/**
 * The admin sidebar's order: a group appears where its first collection here does, so this list
 * is ordered Gallery, Shop, Stores and stock, Orders, Leads and partners, Photos and tags,
 * Content, Settings, Technical records (TASKS.md 3.6.b), each group's own collections kept together.
 */
const COLLECTIONS: readonly CollectionConfig[] = [
  Works,
  Makers,
  Places,
  Products,
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
  Redirects,
  Users,
  Events,
  PaymentEvents,
]

const GLOBALS: readonly GlobalConfig[] = [SiteSettings]

type Drafted = Pick<CollectionConfig | GlobalConfig, 'slug' | 'versions'> & {
  access?: { read?: unknown; readVersions?: unknown }
}

/** Throws for a drafts collection or global that leaves `read` or `readVersions` unset. */
export function assertDraftAccess(kind: 'collection' | 'global', config: Drafted): void {
  const versions = config.versions
  const drafted = typeof versions === 'object' && versions !== null && Boolean(versions.drafts)
  if (!drafted) return
  const missing = (['read', 'readVersions'] as const).filter((key) => !config.access?.[key])
  if (missing.length > 0) {
    throw new Error(
      `${kind} "${config.slug}" has drafts but no access.${missing.join(' / access.')}: use DRAFTED_ACCESS (@engine/cms/access) — Payload would let any signed-in user read its drafts`,
    )
  }
}

/** Throws for a slug two entries share: Payload would keep one and drop the other's table. */
function assertUniqueSlugs(kind: 'collection' | 'global', configs: readonly Drafted[]): void {
  const seen = new Set<string>()
  for (const { slug } of configs) {
    if (seen.has(slug)) throw new Error(`registries/collections: ${kind} "${slug}" is listed twice`)
    seen.add(slug)
  }
}

/** Every collection, each checked for its draft access. */
export function registeredCollections(
  collections: readonly CollectionConfig[] = COLLECTIONS,
): CollectionConfig[] {
  assertUniqueSlugs('collection', collections)
  for (const collection of collections) assertDraftAccess('collection', collection)
  return [...collections]
}

export function registeredGlobals(globals: readonly GlobalConfig[] = GLOBALS): GlobalConfig[] {
  assertUniqueSlugs('global', globals)
  for (const global of globals) assertDraftAccess('global', global)
  return [...globals]
}
