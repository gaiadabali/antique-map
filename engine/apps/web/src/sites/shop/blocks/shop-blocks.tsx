/**
 * A shop page drawn from its sections (`server/shop/pages/blocks`), in order — one renderer for a
 * page the CMS holds and for the built-in one (`./defaults`). Each block maps to the section the
 * design drew for it; the map is typed over every block type, so a block added without a renderer
 * fails to compile.
 *
 * `frame` is the page's outer edge: `home` lifts the first section under the clear header (the
 * home hero sits beneath it), `page` starts below the header, `bare` leaves the edge to the one
 * section that draws its own (the stores directory). A page whose sections bring no h1 gets its
 * title as the h1.
 */
import { Fragment, type ReactNode } from 'react'

import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import type { ShopBlockType, ShopBlockVM } from '../../../server/shop/pages/blocks'
import { FeaturedProducts } from '../home/featured-products'
import { Hero } from '../home/hero'
import homeStyles from '../home/home.module.css'
import { homeText } from '../home/home-messages'
import { Process } from '../home/process'
import { Originals, Story } from '../home/sections'
import { ShopBy } from '../home/shop-by'
import { Enquiry, PartnerSignIn } from '../partnership/enquiry-sections'
import { FactStrip, Offer, PageHero } from '../partnership/page-sections'
import pageStyles from '../partnership/partnership-page.module.css'
import {
  CallToActionSection,
  FaqSection,
  ImageTextSection,
  PageTitle,
  TextSection,
} from './content-blocks'
import { StoreDirectory } from './store-directory'

type Locale = 'en' | 'id'

type Context = { readonly locale: Locale; readonly offerOrdinal: number }

type Renderers = {
  readonly [Type in ShopBlockType]: (
    block: Extract<ShopBlockVM, { type: Type }>,
    context: Context,
  ) => ReactNode
}

const RENDERERS: Renderers = {
  homeHero: (block, { locale }) => <Hero locale={locale} block={block} t={homeText(locale)} />,
  categoryRail: (block, { locale }) => (
    <ShopBy
      locale={locale}
      t={homeText(locale)}
      title={block.title}
      linkLabel={block.linkLabel}
      allHref={createHref(SITES.shop)('collection', {}, locale)}
    />
  ),
  productRail: (block, { locale }) => (
    <FeaturedProducts
      locale={locale}
      t={homeText(locale)}
      block={block}
      allHref={createHref(SITES.shop)('browse', {}, locale)}
    />
  ),
  steps: (block) => <Process block={block} />,
  story: (block, { locale }) => <Story locale={locale} block={block} />,
  originals: (block, { locale }) => <Originals locale={locale} block={block} />,
  pageHero: (block, { locale }) => <PageHero locale={locale} block={block} />,
  factStrip: (block) => <FactStrip block={block} />,
  offer: (block, { locale, offerOrdinal }) => (
    <Offer locale={locale} block={block} ordinal={offerOrdinal} />
  ),
  enquiry: (block, { locale }) => <Enquiry locale={locale} block={block} />,
  partnerSignIn: (block, { locale }) => <PartnerSignIn locale={locale} block={block} />,
  text: (block) => <TextSection block={block} />,
  imageText: (block) => <ImageTextSection block={block} />,
  faq: (block) => <FaqSection block={block} />,
  callToAction: (block) => <CallToActionSection block={block} />,
  storeDirectory: (block, { locale }) => <StoreDirectory locale={locale} block={block} />,
}

const HEADED: ReadonlySet<ShopBlockType> = new Set(['homeHero', 'pageHero', 'storeDirectory'])

function render(block: ShopBlockVM, context: Context): ReactNode {
  const renderer = RENDERERS[block.type] as (block: ShopBlockVM, context: Context) => ReactNode
  return renderer(block, context)
}

type Props = {
  readonly blocks: readonly ShopBlockVM[]
  readonly locale: SiteLocale
  readonly frame: 'home' | 'page' | 'bare'
  /** The page's title: drawn as the h1 when no section brings its own. */
  readonly title?: string
}

export function ShopBlocks({ blocks, locale, frame, title }: Props) {
  const lang: Locale = locale === 'id' ? 'id' : 'en'
  const headed = blocks.some((block) => HEADED.has(block.type))
  let offers = 0
  const sections = (
    <>
      {!headed && title ? <PageTitle title={title} /> : null}
      {blocks.map((block) => {
        const offerOrdinal = block.type === 'offer' ? offers++ : offers
        return <Fragment key={block.id}>{render(block, { locale: lang, offerOrdinal })}</Fragment>
      })}
    </>
  )
  if (frame === 'bare') return sections
  return <div className={frame === 'home' ? homeStyles.wrap : pageStyles.wrap}>{sections}</div>
}
