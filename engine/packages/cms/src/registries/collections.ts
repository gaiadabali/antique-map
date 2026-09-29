/**
 * The frozen slug list (CONTENT-MODEL.md "The frozen slug list") and the registry that puts every
 * one of them in the config from the Foundation stage — as a **stub** until the task that owns it
 * fills in its fields. Collections relate to each other across tasks that run in parallel
 * (9.3's stories point at works while 8.2 is still writing them), and a `relationTo` naming a
 * collection the config lacks fails at boot; so every slug exists now, and tasks fill in fields,
 * never invent slugs. A new slug is a CONTENT-MODEL.md change first.
 *
 * Every collection is registered whatever the brand's modules (ARCHITECTURE.md §2): both brands'
 * databases hold every table. A stub is hidden in the admin, readable by admins only, and
 * writable by nobody — a table with an id and timestamps and no way in.
 *
 * Replacing a stub: the owning task exports its collection from `collections/<slug>/` and the
 * SCH lead swaps the stub for it in `BUILT` below, in the wave that lands it.
 */
import type { CollectionConfig, GlobalConfig } from 'payload'

import { isAdmin } from '../access/roles'
import { Users } from '../collections/users'

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

/** The collections built so far, by slug. Everything else in `COLLECTION_SLUGS` is a stub. */
const BUILT: Partial<Record<EngineCollectionSlug, CollectionConfig>> = {
  users: Users, // SCH — 3.2.b
}
const BUILT_GLOBALS: Partial<Record<EngineGlobalSlug, GlobalConfig>> = {}

const nobody = () => false

export function stubCollection(slug: EngineCollectionSlug): CollectionConfig {
  return {
    slug,
    admin: { hidden: true },
    access: { read: isAdmin, create: nobody, update: nobody, delete: nobody },
    fields: [],
  }
}

export function stubGlobal(slug: EngineGlobalSlug): GlobalConfig {
  return {
    slug,
    admin: { hidden: true },
    access: { read: isAdmin, update: nobody },
    fields: [],
  }
}

/** Every collection, in the frozen order (the admin sidebar's order within each group). */
export function registeredCollections(): CollectionConfig[] {
  return COLLECTION_SLUGS.map((slug) => {
    const built = BUILT[slug]
    if (built && built.slug !== slug) {
      throw new Error(`registries/collections: "${slug}" is registered with slug "${built.slug}"`)
    }
    return built ?? stubCollection(slug)
  })
}

export function registeredGlobals(): GlobalConfig[] {
  return GLOBAL_SLUGS.map((slug) => BUILT_GLOBALS[slug] ?? stubGlobal(slug))
}

/** Which slugs are still stubs — for the report of each wave, and a test that watches them shrink. */
export function stubSlugs(): EngineCollectionSlug[] {
  return COLLECTION_SLUGS.filter((slug) => BUILT[slug] === undefined)
}
