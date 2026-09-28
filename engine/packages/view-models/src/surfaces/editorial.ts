/**
 * @contract C2 — view models: home and editorial surfaces · owner: ARC · consumers: WEB, UXG, UXE, SCH
 *
 * Home bands are ordered by the CMS `homepage` global — reordering is an edit, not a
 * deploy — and a band with nothing real to show is omitted (NOW! S2: no fixture content in
 * shipped code). The band kinds below are the frozen list SCH models that global from; an
 * app renders the bands its design uses. Stories, pages, exhibitions, locations, the
 * link-in-bio page and newsletter issues complete the editorial set.
 */
import type { BlockVM } from '../blocks'
import type { CardVM, RailVM } from '../cards'
import type { ImageVM, IsoDate, IsoDateTime, LinkVM, PriceVM, SeoVM, Streamed } from '../common'

type Page = { seo: SeoVM; breadcrumbs: readonly LinkVM[] }

export type StoryCardVM = {
  title: string
  href: string
  excerpt: string | null
  image: ImageVM | null
  publishedAt: IsoDate
}

export type HomeBandVM =
  /** One object, full attention (the gallery) or the hero line as a story band (the shop). */
  | {
      kind: 'feature'
      title: string
      lede: string | null
      image: ImageVM
      link: LinkVM
      /** A highlight inside the hero — the shop's gate to its Partnership page (D31). */
      highlight: { title: string; body: string | null; link: LinkVM } | null
    }
  /** New arrivals (with the date each arrived), in the showroom now… */
  | { kind: 'rail'; rail: Streamed<RailVM> }
  /** The archipelago as the index: island groups with counts. */
  | { kind: 'places'; title: string; places: readonly (LinkVM & { count: number })[] }
  | { kind: 'curations'; title: string; items: readonly (LinkVM & { image: ImageVM | null })[] }
  | {
      kind: 'makers'
      title: string
      items: readonly (LinkVM & { count: number; portrait: ImageVM | null })[]
    }
  | { kind: 'stories'; title: string; items: readonly StoryCardVM[] }
  /** The certificate, the guarantee, who buys here, how shipping works. */
  | {
      kind: 'trust'
      title: string
      items: readonly { title: string; body: string; href: string | null }[]
    }
  | { kind: 'newsletter'; title: string; body: string | null; sourceKey: string }
  /** One artwork from postcard to numbered edition: the price range the shop spans. */
  | {
      kind: 'formatLadder'
      title: string
      steps: Streamed<readonly { label: string; image: ImageVM; price: PriceVM; href: string }[]>
    }
  | { kind: 'occasions'; title: string; items: readonly (LinkVM & { image: ImageVM | null })[] }
  /** Address, hours, map and WhatsApp for the showroom or gallery. */
  | { kind: 'visit'; location: LocationSummaryVM }
  | { kind: 'instagram'; title: string; posts: readonly IgPostVM[] }
  | {
      kind: 'welcomeOffer'
      title: string
      body: string
      channels: readonly ('email' | 'whatsapp')[]
    }
  /** A free composition from content blocks (C4). */
  | { kind: 'blocks'; blocks: readonly BlockVM[] }

export type HomeVM = { surface: 'home'; bands: readonly HomeBandVM[]; seo: SeoVM }

export type StoryVM = Page & {
  surface: 'story'
  title: string
  excerpt: string | null
  hero: ImageVM | null
  authors: readonly { name: string; href: string | null }[]
  publishedAt: IsoDate
  body: readonly BlockVM[]
  /** "Originals in this story" and "prints from this story" — cards may belong to the sister. */
  related: Streamed<readonly RailVM[]>
  makers: readonly LinkVM[]
  places: readonly LinkVM[]
}

/** About, visit, FAQ, shipping, returns, policies and the trust pages — CMS pages from blocks. */
export type PageVM = Page & {
  surface: 'page'
  title: string
  template: 'default' | 'trust' | 'legal' | 'faq'
  body: readonly BlockVM[]
  updatedAt: IsoDate | null
}

export type ExhibitionVM = Page & {
  surface: 'exhibition'
  kind: 'fair' | 'exhibition' | 'viewing' | 'popup'
  title: string
  hero: ImageVM | null
  dates: { start: IsoDate; end: IsoDate | null }
  venue: { name: string; address: readonly string[]; mapHref: string | null } | null
  description: readonly BlockVM[]
  curations: readonly LinkVM[]
  /** An `.ics` for the calendar. */
  ics: string | null
}

export type OpeningHoursVM = {
  /** IANA: slots always show their time zone (WITA, WIB, SGT). */
  timeZone: string
  weekly: readonly { days: string; opens: string; closes: string }[]
  byAppointment: boolean
  /** A holiday closure from the calendar (Nyepi closes Bali). */
  closure: { from: IsoDate; to: IsoDate; reason: string } | null
}

export type LocationSummaryVM = {
  name: string
  href: string
  address: readonly string[]
  hours: OpeningHoursVM
  map: { lat: number; lng: number; href: string } | null
  whatsapp: string | null
}

export type LocationVM = Page &
  LocationSummaryVM & {
    surface: 'location'
    kind: 'gallery' | 'showroom'
    images: readonly ImageVM[]
    body: readonly BlockVM[]
    /** Book a visit — `services.appointments`. */
    booking: { href: string } | null
    /** Click & collect happens here. */
    pickup: boolean
    /** "In the showroom now." */
    inStock: Streamed<readonly CardVM[]>
  }

export type IgPostVM = {
  image: ImageVM
  caption: string | null
  postedAt: IsoDate | null
  products: Streamed<readonly CardVM[]>
}

/** The link-in-bio page on the shop's own domain (posts curated in the CMS). */
export type IgVM = {
  surface: 'ig'
  profile: { handle: string; href: string } | null
  posts: readonly IgPostVM[]
  seo: SeoVM
}

/** A past issue as a web page; the index is a `DirectoryVM`. */
export type NewsletterArchiveVM = Page & {
  surface: 'newsletterArchive'
  subject: string
  sentAt: IsoDateTime
  /** Sanitised issue HTML, as sent. */
  html: string
  previous: LinkVM | null
  next: LinkVM | null
  signup: { sourceKey: string }
}
