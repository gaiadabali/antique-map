/**
 * @contract C2 — view models: shared building blocks · owner: ARC · consumers: WEB, UXG, UXE, SEO
 *
 * View models are resolved and honest (DESIGN-SYSTEM.md §3): relationships arrive
 * populated, uploads flattened to the media contract (C9), money as C5's `Money` — a safe
 * integer of minor units and a currency code, formatted by `@engine/i18n`, never a float or
 * a preformatted string, and a component never does arithmetic on it — imprecise facts with
 * their precision, and absent data as `null`, so a band with nothing real to show is
 * omitted. Every string here is content in the page's locale; interface wording is the
 * app's message keys, whose values the brand supplies, so VMs carry codes, not UI copy.
 * Types only: `import type` from other packages, never a value.
 */
import type {
  CountryCode,
  CurrencyCode,
  LocaleCode,
  ObjectType,
  ProductKind,
} from '@engine/config/schema'
import type { LineInput, ProductPublicId, VariantId } from '@engine/domain/api'
import type { Money, PriceSet } from '@engine/domain/money'
import type { AssetId, ImageRole } from '@engine/media/contract'

export type { Money, ObjectType, PriceSet, ProductKind, ProductPublicId, VariantId }

/**
 * An opaque record id, stringified by the loader: a React key, an anchor. Never what a
 * control posts — the commerce API (C6) takes a product's public id and a variant's id,
 * which reach it only inside an intent.
 */
export type Id = string
/** `2026-09-25` */
export type IsoDate = string
/** `2026-09-25T14:30:00+08:00` — with its offset, so a slot never loses its time zone. */
export type IsoDateTime = string

/**
 * A part resolved at request time — availability, the ship-to market, the viewer — and
 * streamed into a `<Suspense>` boundary (ARCHITECTURE.md §9). Never produced inside a
 * cached read, and it NEVER rejects: a failed read resolves to its designed fallback — `null`
 * or an empty list (the band is omitted), `enquiryOnly` / `unverified` for a purchase panel,
 * the shell's defaults for the ship-to, the bag and consent — so no error boundary ever
 * stands in for a panel. A fixture passes `Promise.resolve(…)`, or `pending()` for the
 * reserved-height "Checking availability…" state.
 */
export type Streamed<T> = Promise<T>

/**
 * A view model without its request-time parts: what a loader's `'use cache'` + `cacheTag`
 * read may return (phase one, `./loaders`). Every property that holds a `Streamed` part, at
 * any depth — a home band's rail, an item's purchase panel — is left out; phase two adds them.
 * A post's `result` is request-time too but resolved, never streamed (`FormResultVM`): the
 * cached read returns it `null`, and phase two awaits the real one before the page renders.
 */
export type CachedPart<T> =
  T extends Streamed<unknown>
    ? never
    : T extends readonly (infer E)[]
      ? readonly CachedPart<E>[]
      : T extends object
        ? {
            [
              K in keyof T as [Extract<T[K], Streamed<unknown>>] extends [never] ? K : never
            ]: CachedPart<T[K]>
          }
        : T

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
  /**
   * The BCP-47 language of `alt` and `caption` when it is not the page's — a Dutch caption, or
   * a fallback from another locale — so a screen reader switches voice (WCAG 3.1.2).
   */
  lang: string | null
  /** The public IIIF `info.json` when tiles exist; `null` → the plain image, never an error. */
  iiif: string | null
  /** A synthetic mockup or an AI-generated image, labelled as such in the UI. */
  synthetic: boolean
}

/**
 * A price as this visitor's market sees it: C5's `PriceSet`. `charge` is what the seller
 * charges; `estimate` a converted display amount ("≈ €1,020 — charged in USD 1,100") only
 * when `basis` is `converted` — under the rupiah rule (`sole-currency`, every Indonesian
 * destination) there is no field to put a foreign amount in. Display only: nothing a
 * component posts back ever carries it, and the server prices again.
 */
export type PriceVM = PriceSet

/**
 * What a control posts back to the commerce API (C6): ids, choices and the opaque pricing
 * token, never a figure — a view model carries no price a client could send back as
 * authoritative. An intent is the C6 request less the fields the visitor supplies, so a
 * component adds only what was typed or chosen; `commerce-check.ts` proves every intent is
 * server-priced. This one is a line for `cart.addLines`.
 */
export type LineIntent = LineInput

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
  registration: string | null
  address: readonly string[]
}

/**
 * Per page (ARCHITECTURE.md §11): one canonical, reciprocal `hreflang` alternates and an
 * `x-default` (the default locale's URL). `contentLocale` is the locale the main content is
 * really in: when a page falls back to another locale's text it says so — the content carries
 * `lang` — and that locale's URL leaves `alternates`, since it is no translation (WCAG 3.1.2).
 */
export type SeoVM = {
  title: string
  description: string | null
  /** Absolute. */
  canonical: string
  contentLocale: LocaleCode
  alternates: readonly { locale: LocaleCode | 'x-default'; href: string }[]
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

export type Colouring =
  'publishers' | 'original-hand' | 'old-hand' | 'later' | 'printed' | 'uncoloured'
export type Badge = 'hero' | 'printed-in-bali' | 'limited-edition' | 'new' | 'in-showroom'
