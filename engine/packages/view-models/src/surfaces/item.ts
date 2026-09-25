/**
 * @contract C2 — view models: the item page · owner: ARC · consumers: WEB, UXG, UXE, SEO
 *
 * One PDP view model for every product (DESIGN-SYSTEM.md §2): an original map, a numbered
 * facsimile, a giclée print, a tote, a book. The content is cached; `purchase`, the sister
 * link, the rails and the reviews are resolved at request time and streamed. Public fields
 * only: a work's `physical` group, acquisition cost and consignor never reach a view model
 * (ARCHITECTURE.md §12) — `shipsFrom` and the delivery gate are derived from them on the
 * server. Loaded by `loadItem`, which answers `{ vm } | { redirectTo } | null` (`./loaders`).
 */
import type { InventoryModel } from '@engine/config/schema'

import type { BlockVM, CitationVM } from '../blocks'
import type { RailVM } from '../cards'
import type {
  Badge,
  Colouring,
  DimensionsVM,
  FuzzyDateVM,
  Id,
  ImageVM,
  IsoDate,
  LinkVM,
  MakerCreditVM,
  ObjectType,
  PlaceRefVM,
  ProductKind,
  SeoVM,
  Streamed,
  TermVM,
} from '../common'
import type { PurchaseVM, SisterLinkVM } from './purchase'

/** The collation block collectors expect (EXPERIENCE-GALLERY.md §5, the Sanderus model). */
export type RecordVM = {
  objectType: TermVM<ObjectType>
  publication: {
    place: string | null
    publisher: string | null
    /** "From: Oud en Nieuw Oost-Indiën, 1724–26". */
    sourceWork: string | null
    edition: string | null
    state: string | null
    textLanguage: string | null
    /** "Verso: blank". */
    verso: string | null
  }
  firstEdition: FuzzyDateVM | null
  dateOnPlate: FuzzyDateVM | null
  technique: TermVM | null
  colour: TermVM<Colouring> | null
  /** mm; the formatter adds inches. */
  dimensions: DimensionsVM
}

/** Books are not flat sheets: a volume's collation (DESIGN-SYSTEM.md §3). */
export type BookPartVM = {
  binding: string | null
  pagination: string | null
  plates: string | null
  completeness: string | null
  /** Spreads, in order. */
  openings: readonly ImageVM[]
  spine: ImageVM | null
  cover: ImageVM | null
}

/** The grade is a term of the brand's published scale, linked to its legend. */
export type ConditionVM = {
  grade: { label: string; definition: string; equivalent: string | null; scaleHref: string }
  notes: string | null
  defects: readonly string[]
  restoration: string | null
}

export type ReviewsVM = {
  average: number
  count: number
  items: readonly {
    rating: 1 | 2 | 3 | 4 | 5
    title: string | null
    body: string
    author: string
    date: IsoDate
    photos: readonly ImageVM[]
  }[]
  more: LinkVM | null
}

export type ItemVM = {
  surface: 'item'
  id: Id
  /** The id in `/product/{publicId}-{slug}`; legacy ids preserved. */
  publicId: number
  slug: string
  kind: ProductKind
  inventoryModel: InventoryModel
  objectType: ObjectType | null
  /** The hook title, or — designed, not accidental — the original title when none exists yet. */
  title: string
  /** `false`: the title is the fallback, so the maker line is promoted. */
  hasHookTitle: boolean
  /** The diplomatic transcription, set in italic. */
  originalTitle: string | null
  /** `M.0500`, in the mono face — also the WhatsApp reference. */
  stockNumber: string | null
  /** The design's Archive No., on every reproduction and merchandise product. */
  archiveNumber: string | null
  /** The Reproduction label: true for every reproduction and merchandise product. */
  isReproduction: boolean
  badges: readonly Badge[]
  makers: readonly MakerCreditVM[]
  date: FuzzyDateVM | null
  media: {
    /** The LCP: a real, crawlable `<img>`, preloaded; the viewer attaches on intent. */
    primary: ImageVM
    /** The filmstrip in role order: recto, verso, details, raking, transmitted, framed… */
    images: readonly ImageVM[]
    /** The IIIF Presentation 3 manifest (C9), or `null` → plain images. */
    manifest: string | null
    /** The static scale view: the sheet beside a person and an A4 page. */
    scale: { widthMm: number; heightMm: number } | null
  }
  record: RecordVM | null
  book: BookPartVM | null
  condition: ConditionVM | null
  /** Parry numbers first; each links to its source page. */
  references: readonly (CitationVM & { note: string | null })[]
  provenance: readonly { holder: string; period: string | null; note: string | null }[]
  /** The essay. */
  description: readonly BlockVM[]
  /** The shop's 100–150-word story, linking to the full article. */
  story: { text: string; href: string | null } | null
  /** Primary first; the locator map uses the primary place's `geo`. */
  places: readonly PlaceRefVM[]
  /** The maker, collapsed: "Read full biography · 18 available works". */
  maker: { name: string; excerpt: string; href: string; available: Streamed<number> } | null
  /** The shop's collapsed specifications (paper, inks, care). */
  specifications: readonly { label: string; value: string }[]
  purchase: Streamed<PurchaseVM>
  sister: Streamed<SisterLinkVM | null>
  related: Streamed<readonly RailVM[]>
  /** `null` while there are none — the band is omitted, never shown empty. */
  reviews: Streamed<ReviewsVM | null>
  utilities: {
    /** WhatsApp first. */
    share: { url: string; whatsapp: string }
    /** A PDF designers present to clients. */
    factsheet: string | null
    /** "Similar to sell?" — `services.consignment`. */
    consign: string | null
    /** A conservation framing quote. */
    framingQuote: string | null
  }
  seo: SeoVM
  breadcrumbs: readonly LinkVM[]
}
