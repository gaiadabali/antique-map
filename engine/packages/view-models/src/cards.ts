/**
 * @contract C2 — view models: cards and rails · owner: ARC · consumers: WEB, UXG, UXE
 *
 * The tile every listing, rail and search result is made of. One card is one link (KOI's
 * accessibility rule); the wishlist control sits outside it with its own focus stop. A
 * card's status line is live — price in the visitor's market, hold, sold — so every
 * collection of cards on a cached page is `Streamed`.
 */
import type {
  Badge,
  FuzzyDateVM,
  Id,
  ImageVM,
  IsoDateTime,
  LinkVM,
  PriceVM,
  SizeVM,
} from './common'

/** The one status line a card shows (EXPERIENCE-GALLERY.md §4, EXPERIENCE-SHOP.md §2). */
export type CardStatusVM =
  | { kind: 'price'; price: PriceVM }
  /** The cheapest variant that can ship to this destination. */
  | { kind: 'from'; price: PriceVM }
  | { kind: 'priceOnRequest' }
  | { kind: 'onHold'; until: IsoDateTime | null }
  | { kind: 'sold' }
  /** Routable nowhere, or not for sale: the card invites an enquiry. */
  | { kind: 'enquire' }

export type CardVM = {
  id: Id
  href: string
  title: string
  /** On its mat, never cropped; `null` renders the app's designed empty frame. */
  image: ImageVM | null
  /** The in-room shot shown on hover or swipe (the shop's tiles). */
  secondImage: ImageVM | null
  /** "Valentijn, 1726" — maker and date, as the record states them. */
  makerLine: string | null
  date: FuzzyDateVM | null
  dimensions: SizeVM | null
  status: CardStatusVM
  /** At most one. */
  badge: Badge | null
  /** Always true for reproductions and merchandise: the label is never optional. */
  isReproduction: boolean
  archiveNumber: string | null
  /** Frame swatches, each named (DESIGN-SYSTEM.md §9). */
  swatches: readonly { label: string; colour: string }[]
  /** For a product without options: add to the bag from the card. */
  quickAdd: { productId: Id; variantId: Id | null } | null
  /** `null` when `retention.wishlist` is off. */
  wishlist: { productId: Id; saved: boolean } | null
  /** Set when the card belongs to the sister brand: the link leaves this shop and says so. */
  sister: { name: string } | null
}

export type RailKind =
  | 'sameMaker'
  | 'samePlace'
  | 'sameSource'
  | 'otherStates'
  | 'soldExamples'
  | 'sameDesign'
  | 'matchingFrame'
  | 'wallSet'
  | 'newArrivals'
  | 'inShowroom'
  | 'originals'
  | 'prints'

export type RailVM = {
  kind: RailKind
  title: string
  items: readonly CardVM[]
  more: LinkVM | null
}
