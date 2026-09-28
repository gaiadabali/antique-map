/**
 * @contract C1 — brand config: the module registry · owner: ARC · entry: `@engine/config/schema`
 *
 * Capabilities, never brands (BRANDS.md §4). A flag decides whether a brand's admin shows
 * the capability, its routes resolve and its surfaces render; it never changes the schema
 * (ARCHITECTURE.md §2). The keys are a typed union, so a misspelt flag is a type error
 * rather than a feature silently switched off. Adding a module is a contract change.
 */
import { z } from 'zod'

import type { Storefront } from './look'

export const MODULES = {
  'catalogue.unique': 'One-of-one items: checkout lock, sold archive, "notify me of similar"',
  'catalogue.variants': 'Variant axes, SKUs and stock',
  'catalogue.productTypes': 'Product-type templates that generate variants from a design',
  'purchase.offers': 'Make an offer → accept / counter / decline → private payment link',
  'purchase.holds': 'Staff-granted reservations with an expiry',
  'purchase.requestPrice': 'Price-on-request items and the request flow',
  'purchase.invoices': 'Proforma invoice, bank transfer and PO number (institutions, B2B)',
  'media.deepZoom': 'IIIF tiles and the zoom viewer on the item page',
  'media.roomView': '"On the wall" scale preview',
  'configurator.framing': 'Size × paper × frame × mount configurator with a live preview',
  'content.makers': 'Cartographer, engraver, publisher and photographer pages',
  'content.gazetteer': 'Place pages; historical ↔ modern place names in search',
  'content.catalogues': 'Curated web catalogues with live availability',
  'content.journal': 'Stories and articles',
  'content.exhibitions': 'Fairs, exhibitions, viewings and an events calendar',
  'content.linkInBio': 'The link-in-bio page: CMS-curated posts and the products each shows',
  'services.consignment': '"Sell to us" submissions with photos',
  'services.appointments': 'Book a visit to a gallery or showroom',
  'services.wholesale': 'Trade, hotel and corporate-gifting enquiries and tiers',
  'accounts.buyers': 'Buyer accounts: open sign-up and sign-in, the claim flow, the account area',
  'accounts.retailers':
    'Retailer accounts by application only: the Partnership page, staff approval, trade terms, orders by quote (D31)',
  'retention.wishlist': 'Saved items',
  'retention.wantList': 'Saved searches and "tell me when another example arrives"',
  'retention.newsletter': 'Newsletter signup, digest and the issue archive',
  'retention.reviews': 'Product reviews from verified orders',
  'retention.backInStock': 'Restock alerts',
  'retention.abandonedCart': 'Cart-recovery email',
  'commerce.giftCards': 'Digital gift cards: buy, schedule for a recipient, check a balance',
  'commerce.giftWrap': 'Gift wrap as a service line, gift notes, prices hidden on the slip',
  'commerce.discounts': 'Discount codes and automatic rules',
  'commerce.bundles': 'Bundles, sets and multi-buy rules',
  'fulfilment.pod': 'Print-on-demand routing near the buyer (v2)',
  'fulfilment.clickAndCollect': 'Pickup at a gallery or showroom',
  'sister.links': '"Own the original" ↔ "get a print" cross-links and work sync',
  'ai.cataloguing': 'Vision-assisted draft cataloguing in the admin, always human-verified',
  'channels.marketplaces': 'Marketplace channel sync (later)',
} as const satisfies Record<string, string>

export type ModuleKey = keyof typeof MODULES
export const MODULE_KEYS = Object.keys(MODULES) as [ModuleKey, ...ModuleKey[]]
export const moduleKeySchema = z.enum(MODULE_KEYS)

/** `brand.modules`: a module that is absent is off. */
export const modulesSchema = z.partialRecord(moduleKeySchema, z.boolean())
export type ModuleFlags = z.infer<typeof modulesSchema>

/** The only way code asks what a brand can do (CONVENTIONS.md §1). */
export function hasModule(config: { readonly modules: ModuleFlags }, key: ModuleKey): boolean {
  return config.modules[key] === true
}

/**
 * What a storefront app declares it can render (its `supports` file, TASKS.md 4.1.c).
 * `validateBrandConfigs()` rejects a brand whose modules are not a subset, so a missing
 * surface fails CI instead of rendering as a blank section (BRANDS.md §6). It is also how a
 * difference of archetype stays a flag rather than a brand check: the emporium's list omits
 * `accounts.buyers` — shoppers there buy as guests, so no shop can open shopper sign-up — and
 * the gallery's omits `accounts.retailers`, so the Partnership surface is the emporium's (D31).
 */
export type AppSupports = {
  readonly storefront: Storefront
  readonly modules: readonly ModuleKey[]
}
