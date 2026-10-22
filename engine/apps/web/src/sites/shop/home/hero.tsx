/**
 * The shop home's hero (the redesign of 2026-10-20, the handoff's Poster Club hero): two full-bleed
 * halves under the clear header — the words centred on the warm left half, the lead print framed
 * on the grey right half with its name and price at the corner, the way a gallery labels a wall.
 * The print is the first of the home's featured products with a published image — the same cached
 * read as the "Begin with these" rail, so no second query. Until that read lands, or while the shop
 * holds no product, the bare well keeps its place. The words are the page's `homeHero` block (the
 * CMS, or the lexicon's defaults); the placeholder and the "From" before a price are the lexicon's.
 */
import { Suspense, type ReactNode } from 'react'

import { createHref, SITES } from '@engine/config/sites'

import {
  Button,
  Price,
  PrintTile,
  PrintTileNote,
  ResponsiveImage,
  printAspectOf,
} from '../../../shared/ui'
import { productText } from '../product/copy'
import { imageAlt } from '../product/synthetic'
import { Caps, CapsLink } from '../ui/caps-link'
import {
  loadFeaturedProducts,
  type FeaturedProduct,
} from '../../../server/shop/home/load-featured-products'
import type { HomeHeroVM } from '../../../server/shop/pages/blocks'
import { linkProps } from '../blocks/link-props'
import { windowRatio } from './frame-ratio'
import styles from './hero.module.css'
import type { HomeText } from './home-messages'

type Props = {
  readonly locale: 'en' | 'id'
  readonly block: HomeHeroVM
  readonly t: HomeText
}

export function Hero(props: Props) {
  return (
    <Suspense fallback={<Frame {...props} pending print={<Empty />} />}>
      <LeadPrint {...props} />
    </Suspense>
  )
}

type FrameProps = Props & {
  readonly print: ReactNode
  readonly caption?: ReactNode
  /**
   * The placeholder while the read streams. Its title is the page's h1 too, so the page is never
   * without one, but without the id: the finished hero streams in hidden until it replaces this
   * one, so one h1 is ever exposed and no id is ever doubled.
   */
  readonly pending?: boolean
}

function Frame({ block, print, caption, pending = false }: FrameProps) {
  return (
    <section className={styles.hero} aria-labelledby={pending ? undefined : 'home-title'}>
      <div className={styles.words}>
        <div className={styles.block}>
          <h1 id={pending ? undefined : 'home-title'} className={styles.title}>
            {block.title}
          </h1>
          {block.lede ? <p className={styles.lede}>{block.lede}</p> : null}
          {block.primary || block.secondary ? (
            <div className={styles.actions}>
              {block.primary ? (
                <Button variant="secondary" size="small" {...linkProps(block.primary)}>
                  {block.primary.label}
                </Button>
              ) : null}
              {block.secondary ? (
                <CapsLink {...linkProps(block.secondary)}>{block.secondary.label}</CapsLink>
              ) : null}
            </div>
          ) : null}
          {block.signals.length > 0 ? (
            <ul className={styles.signals}>
              {block.signals.map((signal) => (
                <li key={signal}>
                  <Caps>{signal}</Caps>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <div className={styles.wall}>
        {print}
        {caption ? <p className={styles.caption}>{caption}</p> : null}
      </div>
    </section>
  )
}

function Empty({ note }: { readonly note?: string }) {
  return (
    <PrintTile className={styles.tile}>
      {note ? <PrintTileNote>{note}</PrintTileNote> : <span className={styles.blank} />}
    </PrintTile>
  )
}

async function LeadPrint(props: Props) {
  const { locale, t } = props
  let products: readonly FeaturedProduct[] = []
  try {
    products = await loadFeaturedProducts(locale)
  } catch {
    products = []
  }
  const lead = products.find((product) => product.image !== null) ?? products[0]
  if (lead === undefined) return <Frame {...props} print={<Empty note={t('home.shop.heroA')} />} />
  const href = createHref(SITES.shop)('product', { slug: lead.slug }, locale)
  const caption = (
    <>
      <a className={styles.captionTitle} href={href}>
        {lead.name}
      </a>
      <span className={styles.captionPrice}>
        {t('home.shop.pricePrefix')} <Price amount={lead.price} />
      </span>
    </>
  )
  if (lead.image === null) {
    return <Frame {...props} print={<Empty note={lead.name} />} caption={caption} />
  }
  const ratio = windowRatio(lead.image)
  const words = productText(locale)
  return (
    <Frame
      {...props}
      caption={caption}
      print={
        // The print opens its page too; the caption's name is the one link in the tab order.
        <a className={styles.printLink} href={href} tabIndex={-1} aria-hidden="true">
          <PrintTile ratio={ratio} className={styles.tile}>
            {/* The page's largest paint: preloaded at high priority. */}
            <ResponsiveImage
              variant="fill"
              aspectRatio={printAspectOf(ratio)}
              src={lead.image.url}
              srcSet={lead.image.srcSet}
              sizes="(max-width: 56.25rem) 80vw, 40vw"
              alt={imageAlt(words, lead.image)}
              priority
              unoptimized
            />
          </PrintTile>
        </a>
      }
    />
  )
}
