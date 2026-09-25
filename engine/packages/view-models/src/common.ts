/**
 * @contract C2 — view models: shared building blocks · owner: ARC · consumers: WEB, UXG, UXE, SEO
 *
 * View models are resolved and honest (DESIGN-SYSTEM.md §3): relationships arrive
 * populated, uploads flattened to the media contract (C9), money as C5's `Money` formatted
 * by `@engine/i18n` — a component never does arithmetic on a price — imprecise facts with
 * their precision, and absent data as `null`, so a band with nothing real to show is
 * omitted. Every string here is content in the page's locale; interface wording is the
 * app's message keys, whose values the brand supplies, so VMs carry codes, not UI copy.
 * Types only: `import type` from other packages, never a value.
 */
import type { CountryCode, CurrencyCode, LocaleCode } from '@engine/config/schema'
import type { Money } from '@engine/domain/money'
import type { AssetId, ImageRole } from '@engine/media/contract'

export type { Money }

/** An opaque record id, stringified by the loader; the commerce API (C6) takes the same. */
export type Id = string
/** `2026-09-25` */
export type IsoDate = string
/** `2026-09-25T14:30:00+08:00` — with its offset, so a slot never loses its time zone. */
export type IsoDateTime = string

/**
 * A part resolved at request time — availability, the ship-to market, the viewer — and
 * streamed into a `<Suspense>` boundary (ARCHITECTURE.md §9). Never produced inside a
 * cached read. A fixture passes `Promise.resolve(…)`, or a promise that never settles to
 * show the reserved-height "Checking availability…" state.
 */
export type Streamed<T> = Promise<T>

/** A resolved link: `href` comes from C10's `href()` (or is absolute, for a sister). */
export type LinkVM = { label: string; href: string }

/** A code the app turns into words through its own message keys, with the values to fill. */
export type MessageVM<Code extends string = string> = {
  code: Code
  params?: Readonly<Record<string, string | number>>
}

/** Precision is part of the fact: render `c. 1750`, never `1750` (DESIGN-SYSTEM.md §10). */
export type DatePrecision = 'exact' | 'circa' | 'before' | 'after' | 'range' | 'unknown'
export type FuzzyDateVM = {
  precision: DatePrecision
  /** Years; `to` only for a range. */
  from: number | null
  to: number | null
  /** The cataloguer's own wording ("1724–26"), which wins over the formatter. */
  display: string | null
}

/** Millimetres; inches are derived by `formatDimensions`, never typed. */
export type SizeVM = { heightMm: number; widthMm: number }
export type DimensionsVM = {
  image: SizeVM | null
  sheet: SizeVM | null
  framed: (SizeVM & { depthMm: number }) | null
}

/**
 * An image flattened to the media contract (C9). `width` × `height` are intrinsic pixels,
 * so space is always reserved; `sources` are srcsets per format from the derivative ladder.
 * An original is shown on its mat and never cropped — the app's image treatment decides how.
 */
export type ImageVM = {
  assetId: AssetId
  /** Always present: a deterministic baseline built from the record if nobody wrote one. */
  alt: string
  width: number
  height: number
  /** The fallback: the 1024 px WebP. */
  src: string
  sources: readonly { format: 'avif' | 'webp'; srcSet: string }[]
  blurDataUrl: string | null
  focalPoint: { x: number; y: number } | null
  role: ImageRole | null
  caption: string | null
  credit: string | null
  /** The public IIIF `info.json` when tiles exist; `null` → the plain image, never an error. */
  iiif: string | null
  /** A synthetic mockup or an AI-generated image, labelled as such in the UI. */
  synthetic: boolean
}

/**
 * A price for this visitor's destination: `charge` is what the seller charges; `estimate`
 * a converted display amount ("≈ €1,020 — charged in USD 1,100"), only for export
 * destinations — always `null` for Indonesia, where the rupiah rule allows IDR alone.
 */
export type PriceVM = { charge: Money; estimate: Money | null }

export type ShipToVM = {
  country: CountryCode
  currency: CurrencyCode
  /** Countries the selector offers, each with the currency its market prices in. */
  options: readonly { country: CountryCode; currency: CurrencyCode }[]
}

/** The seller of record for a checkout, an order, a payment link or the footer. */
export type SellerIdentityVM = {
  name: string
  country: CountryCode
  registration: string
  address: readonly string[]
}

/** Per page (ARCHITECTURE.md §11): one canonical, reciprocal `hreflang` alternates. */
export type SeoVM = {
  title: string
  description: string | null
  /** Absolute. */
  canonical: string
  alternates: readonly { locale: LocaleCode; href: string }[]
  /** A request-time Open Graph image (C13 `/api/x/og/…`). */
  image: string | null
  noindex: boolean
}

/** A person or studio credited on a work, with the certainty the record holds. */
export type MakerRole =
  | 'cartographer'
  | 'engraver'
  | 'publisher'
  | 'author'
  | 'artist'
  | 'photographer'
  | 'studio'
  | 'printer'
export type Certainty = 'certain' | 'attributed' | 'after' | 'workshop'
export type MakerCreditVM = {
  /** "François Valentijn" */
  name: string
  /** "VALENTIJN, François" — the collector's maker line. */
  sortName: string
  role: MakerRole
  certainty: Certainty
  born: FuzzyDateVM | null
  died: FuzzyDateVM | null
  href: string | null
}

export type PlaceRole = 'depicts' | 'published-at' | 'photographed-at'
export type PlaceRefVM = {
  name: string
  historicalNames: readonly string[]
  role: PlaceRole
  primary: boolean
  href: string | null
  geo: { lat: number; lng: number } | null
}

/** A controlled vocabulary value: its key for logic, its label for the page. */
export type TermVM<Key extends string = string> = { key: Key; label: string }

export type ObjectType =
  | 'map'
  | 'sea-chart'
  | 'city-plan'
  | 'view'
  | 'print'
  | 'photograph'
  | 'book'
  | 'atlas'
  | 'poster'
  | 'document'
  | 'ethnographic'
  | 'other'
export type Colouring =
  'publishers' | 'original-hand' | 'old-hand' | 'later' | 'printed' | 'uncoloured'
export type ProductKind =
  'original' | 'edition' | 'reproduction' | 'merchandise' | 'book' | 'service' | 'gift-card'
export type Badge = 'hero' | 'printed-in-bali' | 'limited-edition' | 'new' | 'in-showroom'
