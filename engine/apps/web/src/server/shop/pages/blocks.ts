/**
 * A shop page's sections as the renderers receive them: every word resolved to the visitor's
 * language, every link to an address, every picture to the public derivative. The CMS blocks
 * (`@engine/cms` `collections/pages/blocks`) are the source; `./project` makes these from them,
 * and `sites/shop/blocks/defaults` makes the same shapes from the lexicon for a page the CMS does
 * not hold yet — so one renderer draws both.
 */
import type { CatalogueImage } from '../catalogue/view-models'

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
  }
>
export type CategoryRailVM = Of<'categoryRail', { title: string; linkLabel: string | null }>
export type ProductRailVM = Of<
  'productRail',
  {
    title: string
    linkLabel: string | null
    categoryId: number | null
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
