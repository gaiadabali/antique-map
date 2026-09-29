/**
 * The frozen slug list (CONTENT-MODEL.md "The frozen slug list") and the registry that puts every
 * one of them in the config from the Foundation stage (TASKS.md 3.2.e, 3.2.g). Each collection
 * lives in its own `collections/<slug>/index.ts` — a stub (`collections/stub.ts`) until the task
 * that owns the slug replaces that file — so a collection task edits only its folder, never this
 * registry. A new slug is a CONTENT-MODEL.md change first.
 *
 * Every collection is registered whatever the brand's modules (ARCHITECTURE.md §2): both brands'
 * databases hold every table. Globals stay stubs here until 9.3 builds them.
 *
 * A collection or global with drafts must say who reads its drafts: `read` and `readVersions`
 * both set (`DRAFTED_ACCESS`), or the config refuses to build — Payload's fallback for an unset
 * `readVersions` is "any signed-in user", which would show a buyer every draft through `/versions`.
 */
import type { CollectionConfig, GlobalConfig } from 'payload'

import { isAdmin } from '../access/roles'
import { Addresses } from '../collections/addresses'
import { Appointments } from '../collections/appointments'
import { Carts } from '../collections/carts'
import { Consignments } from '../collections/consignments'
import { Curations } from '../collections/curations'
import { Customers } from '../collections/customers'
import { Designs } from '../collections/designs'
import { Discounts } from '../collections/discounts'
import { Enquiries } from '../collections/enquiries'
import { Exhibitions } from '../collections/exhibitions'
import { GiftCards } from '../collections/gift-cards'
import { Invoices } from '../collections/invoices'
import { Locations } from '../collections/locations'
import { Makers } from '../collections/makers'
import { Masters } from '../collections/masters'
import { Media } from '../collections/media'
import { Offers } from '../collections/offers'
import { Orders } from '../collections/orders'
import { Pages } from '../collections/pages'
import { PaymentAttempts } from '../collections/payment-attempts'
import { Places } from '../collections/places'
import { Products } from '../collections/products'
import { ProductTypes } from '../collections/product-types'
import { Redirects } from '../collections/redirects'
import { Refunds } from '../collections/refunds'
import { Reservations } from '../collections/reservations'
import { Returns } from '../collections/returns'
import { Reviews } from '../collections/reviews'
import { SavedItems } from '../collections/saved-items'
import { Shipments } from '../collections/shipments'
import { Sources } from '../collections/sources'
import { StockLevels } from '../collections/stock-levels'
import { Stories } from '../collections/stories'
import { Subscribers } from '../collections/subscribers'
import { Terms } from '../collections/terms'
import { Users } from '../collections/users'
import { Variants } from '../collections/variants'
import { WantLists } from '../collections/want-lists'
import { Works } from '../collections/works'

/** The frozen order: the admin sidebar's order within each group. */
const COLLECTIONS = [
  Users,
  Customers,
  Addresses,
  SavedItems,
  WantLists,
  Subscribers,
  Reviews,
  Makers,
  Places,
  Terms,
  Sources,
  Curations,
  Works,
  Designs,
  Products,
  ProductTypes,
  Variants,
  Locations,
  StockLevels,
  Media,
  Masters,
  Stories,
  Pages,
  Exhibitions,
  Redirects,
  Carts,
  Reservations,
  Orders,
  PaymentAttempts,
  Refunds,
  Shipments,
  Returns,
  Offers,
  Enquiries,
  Consignments,
  Appointments,
  Invoices,
  Discounts,
  GiftCards,
] as const satisfies readonly CollectionConfig[]

export const COLLECTION_SLUGS = [
  'users',
  'customers',
  'addresses',
  'saved-items',
  'want-lists',
  'subscribers',
  'reviews',
  'makers',
  'places',
  'terms',
  'sources',
  'curations',
  'works',
  'designs',
  'products',
  'product-types',
  'variants',
  'locations',
  'stock-levels',
  'media',
  'masters',
  'stories',
  'pages',
  'exhibitions',
  'redirects',
  'carts',
  'reservations',
  'orders',
  'payment-attempts',
  'refunds',
  'shipments',
  'returns',
  'offers',
  'enquiries',
  'consignments',
  'appointments',
  'invoices',
  'discounts',
  'gift-cards',
] as const
export type EngineCollectionSlug = (typeof COLLECTION_SLUGS)[number]

export const GLOBAL_SLUGS = [
  'brand-settings',
  'navigation',
  'homepage',
  'commerce-settings',
  'consent',
  'seo-defaults',
] as const
export type EngineGlobalSlug = (typeof GLOBAL_SLUGS)[number]

const nobody = () => false

export function stubGlobal(slug: EngineGlobalSlug): GlobalConfig {
  return {
    slug,
    admin: { hidden: true },
    access: { read: isAdmin, update: nobody },
    fields: [],
  }
}

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

/** Every collection, in the frozen order, each checked against the slug it is registered under. */
export function registeredCollections(
  collections: readonly CollectionConfig[] = COLLECTIONS,
): CollectionConfig[] {
  if (collections.length !== COLLECTION_SLUGS.length) {
    throw new Error(
      `registries/collections: ${collections.length} collections for ${COLLECTION_SLUGS.length} frozen slugs`,
    )
  }
  return collections.map((collection, i) => {
    if (collection.slug !== COLLECTION_SLUGS[i]) {
      throw new Error(
        `registries/collections: position ${i} is "${collection.slug}", the frozen list says "${COLLECTION_SLUGS[i]}"`,
      )
    }
    assertDraftAccess('collection', collection)
    return collection
  })
}

export function registeredGlobals(
  globals: readonly GlobalConfig[] = GLOBAL_SLUGS.map(stubGlobal),
): GlobalConfig[] {
  for (const global of globals) assertDraftAccess('global', global)
  return [...globals]
}

/** Which collections are still stubs — hidden and field-less — for each wave's report. */
export function stubSlugs(): EngineCollectionSlug[] {
  return COLLECTION_SLUGS.filter((slug, i) => {
    const collection = COLLECTIONS[i]!
    return collection.fields.length === 0 && collection.admin?.hidden === true && slug !== 'users'
  })
}
