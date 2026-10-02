/**
 * @contract C2 — view models: discovery surfaces · owner: ARC · consumers: WEB, UXG, UXE, SEO
 *
 * The pages that beat programmatic marketplace pages for "antique maps of Java": makers,
 * places (the gazetteer), sources (the bibliography), curations, web catalogues, and the
 * shop's design pages — one artwork, every product made from it. Content is cached; the
 * works they list carry live status and market prices, so those collections are streamed.
 * Each surface's bare segment is its index, a `DirectoryVM` (`./listing`).
 */
import type { BlockVM } from '../blocks'
import type { CardVM } from '../cards'
import type {
  FuzzyDateVM,
  ImageVM,
  IsoDate,
  LinkVM,
  MakerRole,
  PriceVM,
  SeoVM,
  Streamed,
} from '../common'
import type { SisterLinkVM } from './sister'

/** What is available and what has sold: sold works stay visible (DESIGN-SYSTEM.md §10). */
export type WorksVM = {
  available: readonly CardVM[]
  sold: readonly CardVM[]
  totals: { available: number; sold: number }
  more: LinkVM | null
}

type Page = { seo: SeoVM; breadcrumbs: readonly LinkVM[] }

export type MakerVM = Page & {
  surface: 'maker'
  name: string
  sortName: string
  /** Valentyn, Valentijn — the spellings search already understands. */
  aliases: readonly string[]
  roles: readonly MakerRole[]
  born: FuzzyDateVM | null
  died: FuzzyDateVM | null
  nationality: string | null
  portrait: ImageVM | null
  bio: readonly BlockVM[]
  /** Wikidata, ULAN — also emitted as JSON-LD `sameAs`. */
  sameAs: readonly LinkVM[]
  works: Streamed<WorksVM>
  stories: readonly LinkVM[]
}

export type PlaceVM = Page & {
  surface: 'place'
  name: string
  historicalNames: readonly { name: string; language: string | null; period: string | null }[]
  /** "island", "town", "region" — the gazetteer's type, as a label. */
  type: string | null
  /** Ancestors, outermost first — also the breadcrumbs of a hierarchical path. */
  ancestors: readonly LinkVM[]
  children: readonly (LinkVM & { count: number })[]
  geo: { lat: number; lng: number; bbox: [number, number, number, number] | null } | null
  /** How it was mapped: the essay. */
  description: readonly BlockVM[]
  works: Streamed<WorksVM>
  stories: readonly LinkVM[]
}

export type SourceVM = Page & {
  surface: 'source'
  /** "Fictus" — how references cite it. */
  shortCite: string
  citation: string
  year: number | null
  url: string | null
  works: Streamed<WorksVM>
}

/** A curation of kind collection, gift guide or wall set; catalogues and exhibitions have their own. */
export type CollectionVM = Page & {
  surface: 'collection'
  kind: 'collection' | 'gift-guide' | 'wall-set'
  title: string
  intro: readonly BlockVM[]
  hero: ImageVM | null
  dates: { from: IsoDate; to: IsoDate | null } | null
  /**
   * A price-named curation ("Gifts under $350") stores a threshold per market; this is the
   * visitor's, so an Indonesian-delivery page reads in rupiah and never shows dollars.
   */
  threshold: Streamed<PriceVM> | null
  members: Streamed<{ items: readonly CardVM[]; total: number; more: LinkVM | null }>
}

/** A web-native catalogue with live availability (`content.catalogues`; the PDF is v2). */
export type CatalogueVM = Page & {
  surface: 'catalogue'
  title: string
  intro: readonly BlockVM[]
  hero: ImageVM | null
  dates: { from: IsoDate; to: IsoDate | null } | null
  sections: readonly {
    title: string | null
    body: readonly BlockVM[]
    entries: Streamed<readonly CardVM[]>
  }[]
  pdf: string | null
}

/** One artwork, every product made from it (EXPERIENCE-SHOP.md §6). */
export type DesignVM = Page & {
  surface: 'design'
  title: string
  archiveNumber: string
  image: ImageVM
  story: string | null
  /** The original's status at the sister gallery, in the visitor's market currency. */
  original: Streamed<SisterLinkVM | null>
  products: Streamed<readonly CardVM[]>
  /** "Print from the Archive": a configurable print with no stock, rights and resolution allowing. */
  printFromArchive: { href: string } | null
}
