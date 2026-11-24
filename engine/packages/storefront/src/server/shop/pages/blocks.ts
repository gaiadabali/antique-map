/**
 * A shop page's sections as the renderers receive them: every word resolved to the visitor's
 * language, every link to an address, every picture to the public derivative. The CMS blocks
 * (`@engine/cms` `collections/pages/blocks`) are the source; `./project` makes these from them.
 * The seed (`./seed`) writes the shop's first pages from the same shapes.
 */
import type { CatalogueImage } from '../catalogue/view-models'
import type { RailSelection } from './rail'

/** A resolved link: its words and its address. `external` opens in a new tab. */
export type BlockLink = {
  readonly label: string
  readonly href: string
  readonly external: boolean
}

type Of<Type extends string, Props> = { readonly type: Type; readonly id: string } & Props

export type HomeHeroVM = Of<
  'homeHero',
  {
    title: string
    lede: string | null
    primary: BlockLink | null
    secondary: BlockLink | null
    signals: readonly string[]
    /** The editor's chosen picture; `null` draws the first featured product's print. */
    image: CatalogueImage | null
  }
>
export type CategoryRailVM = Of<'categoryRail', { title: string; linkLabel: string | null }>
export type ProductRailVM = Of<
  'productRail',
  {
    title: string
    linkLabel: string | null
    /** The newest, the newest of a category, or the editor's picks in order (`./rail`). */
    products: RailSelection
    emptyTitle: string
    emptyBody: string
  }
>
export type StepsVM = Of<
  'steps',
  {
    anchor: string | null
    title: string
    steps: readonly { title: string; body: string | null }[]
  }
>
export type StoryVM = Of<
  'story',
  {
    title: string
    lead: string | null
    body: string | null
    facts: readonly string[]
    link: BlockLink | null
  }
>
export type OriginalsVM = Of<
  'originals',
  { label: string | null; title: string; body: string | null; linkLabel: string }
>
export type PageHeroVM = Of<
  'pageHero',
  {
    eyebrow: string | null
    title: string
    lede: string | null
    primary: BlockLink | null
    secondary: BlockLink | null
  }
>
export type FactStripVM = Of<'factStrip', { facts: readonly string[] }>
export type OfferVM = Of<
  'offer',
  {
    anchor: string | null
    eyebrow: string | null
    title: string
    body: string | null
    terms: readonly { label: string; value: string }[]
    link: BlockLink | null
    warm: boolean
  }
>
export type EnquiryVM = Of<
  'enquiry',
  {
    anchor: string | null
    eyebrow: string | null
    title: string
    body: string | null
    talkFirst: string | null
    whatsappMessage: string | null
  }
>
export type PartnerSignInVM = Of<
  'partnerSignIn',
  { eyebrow: string | null; title: string; body: string | null }
>
export type TextVM = Of<
  'text',
  { anchor: string | null; title: string | null; paragraphs: readonly string[] }
>
export type ImageTextVM = Of<
  'imageText',
  {
    anchor: string | null
    image: CatalogueImage | null
    side: 'left' | 'right'
    eyebrow: string | null
    title: string
    paragraphs: readonly string[]
    link: BlockLink | null
  }
>
export type FaqVM = Of<
  'faq',
  {
    anchor: string | null
    title: string | null
    items: readonly { question: string; paragraphs: readonly string[] }[]
  }
>
export type CallToActionVM = Of<
  'callToAction',
  { title: string; body: string | null; link: BlockLink | null }
>
export type StoreDirectoryVM = Of<
  'storeDirectory',
  { title: string; lede: string | null; empty: string | null }
>

/**
 * A video or a PDF from Media, as the page links it: the public route that serves it
 * (`/api/x/media/{id}`, same origin) and the words the record carries (`../../media/public-file`).
 */
export type PublicFile = {
  readonly url: string
  readonly mimeType: string
  readonly title: string
  readonly description: string | null
  /** The file's size in bytes, for a PDF link's "PDF, 2.1 MB". */
  readonly size: number | null
}

export type VideoVM = Of<
  'video',
  {
    anchor: string | null
    video: PublicFile
    poster: CatalogueImage | null
    caption: string | null
  }
>
export type DocumentLinkVM = Of<
  'documentLink',
  { anchor: string | null; document: PublicFile; label: string; note: string | null }
>

export type ShopBlockVM =
  | HomeHeroVM
  | CategoryRailVM
  | ProductRailVM
  | StepsVM
  | StoryVM
  | OriginalsVM
  | PageHeroVM
  | FactStripVM
  | OfferVM
  | EnquiryVM
  | PartnerSignInVM
  | TextVM
  | ImageTextVM
  | FaqVM
  | CallToActionVM
  | StoreDirectoryVM
  | VideoVM
  | DocumentLinkVM

export type ShopBlockType = ShopBlockVM['type']

/** A shop page as its route renders it. */
export type ShopPageVM = {
  readonly title: string
  readonly blocks: readonly ShopBlockVM[]
  readonly seoTitle: string | null
  readonly seoDescription: string | null
  /** The page's own sharing picture (`seo.image`), or `null` for the site's card. */
  readonly seoImage: CatalogueImage | null
}
