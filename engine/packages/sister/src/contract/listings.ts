/**
 * @contract C12 Sister archive API — listings both ways · owner: ARC · via `@engine/sister/contract`
 *
 * What one brand shows of the other's goods, rendered on its own pages from its copy: the
 * original a print was made from (origin → outlet, in each `WorkSnapshot`), and the products the
 * outlet makes from a work (outlet → origin, `PrintsFeed`). Each carries its prices per market, as
 * the brand that sells shows them — so the page it lands on can show this visitor's own figure,
 * the rupiah rule included — and absolute URLs, because it renders on the other brand's domain.
 */
import type { CountryCode, Destination, LocaleCode, ProductKind } from '@engine/config/schema'
import type { AvailabilityState } from '@engine/domain/machines/availability'
import type { IsoInstant } from '@engine/domain/api'
import type { PriceSet } from '@engine/domain/money'

/** Text per locale, as the brand published it. */
export type Localised = { readonly [L in LocaleCode]?: string }

/**
 * A URL with its origin: a sister's page or asset, rendered on another brand's domain. `http://`
 * only in development (a local sister); a receiver refuses one anywhere else.
 */
export type AbsoluteUrl = `https://${string}` | `http://${string}`
export type LocalisedUrls = { readonly [L in LocaleCode]?: AbsoluteUrl }

/**
 * An image as its brand's public media serves it: C9's derivative ladder at absolute URLs on that
 * brand's media host, which the other brand renders as it arrives — never copying it into its own
 * bucket, never deriving it again (its CSP allows the sister's media host). A new derivative
 * version is a new snapshot: `work.updated`, or `prints.updated`.
 */
export type SnapshotImage = {
  /** C9 `AssetId`: the content address the derivative keys are built from. */
  readonly assetId: string
  readonly width: number
  readonly height: number
  readonly alt: Localised
  /** The fallback: the 1024 px WebP. */
  readonly src: AbsoluteUrl
  /** Every URL in a `srcSet` is absolute too, on the same media host as `src`. */
  readonly sources: readonly { readonly format: 'avif' | 'webp'; readonly srcSet: string }[]
}

/**
 * A price as the selling brand's page shows it to a visitor shipping to one of `destinations`:
 * the PriceSet of its market for them — IDR alone for Indonesia. The entries' destinations are
 * disjoint and at most one holds `*` (C1's market rule); a destination it cannot deliver to has
 * none. The page it lands on takes the entry holding the visitor's ship-to country, else `*`.
 */
export type MarketPrice = {
  readonly destinations: readonly Destination[]
  readonly price: PriceSet
}

/**
 * The original's listing at the origin, as the outlet's "own the original" shows it: its state,
 * its prices per market and where it can be bought. `sellsTo` is the public consequence of the
 * export status the origin's item page already states — never the status itself, never the
 * location. For a visitor shipping to country D, C2's `SisterLinkVM` `original` reads, first rule
 * that holds:
 * - `sold` → `sold`, no price, no buy route;
 * - `withdrawn` (taken off sale at the origin), or `sellsTo` `enquiry-only` → `enquire`, no price;
 * - `reserved` → `onHold`, its price for D if it has one, no buy route;
 * - `available` → `available`, its price for D, and `canBuy` only with a `fixed` price for D —
 *   none for D (a `domestic-only` original seen from abroad), or `on-request` / `offer-only`,
 *   links to the origin's page to ask instead.
 */
export type OriginalListing = {
  readonly productPublicId: number
  readonly urls: LocalisedUrls
  readonly availability: AvailabilityState
  readonly pricing: 'fixed' | 'on-request' | 'offer-only'
  /** Empty when on request, offer-only or sold. */
  readonly prices: readonly MarketPrice[]
  readonly sellsTo:
    | { readonly kind: 'anywhere' }
    /** Deliverable only within `country` ("… can only be delivered within Indonesia"). */
    | { readonly kind: 'domestic-only'; readonly country: CountryCode }
    /** No recorded location or export status: the link offers an enquiry, never a buy route. */
    | { readonly kind: 'enquiry-only' }
  /** How fresh this is: a link never claims more certainty than its copy has. */
  readonly asOf: IsoInstant
}

/**
 * A product the outlet makes from a work, as the origin's "Prints of this map" shows it (BRANDS.md
 * §5, C2 `SisterLinkVM` `prints`): a published product, read by the same published-only, projected
 * read as the outlet's own pages, carrying public fields only.
 */
export type PrintListing = {
  readonly productPublicId: number
  readonly kind: ProductKind
  readonly title: Localised
  /** The design's Archive No., shown on every reproduction. */
  readonly archiveNumber: string | null
  readonly urls: LocalisedUrls
  readonly image: SnapshotImage | null
  /** Per market, its cheapest variant that ships there — "from" when its variants differ. */
  readonly prices: readonly MarketPrice[]
  readonly priceFrom: boolean
  readonly availability: 'available' | 'sold-out'
}

/**
 * Everything the outlet makes from one work, as of `asOf`. It replaces the origin's copy for that
 * work whole, so a product withdrawn is simply absent, and an empty list removes the link.
 */
export type PrintsFeed = {
  readonly workUid: string
  readonly prints: readonly PrintListing[]
  readonly asOf: IsoInstant
}
