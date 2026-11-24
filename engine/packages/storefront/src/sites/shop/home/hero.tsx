/**
 * The shop home's hero (the redesign of 2026-10-20, the handoff's Poster Club hero): two full-bleed
 * halves under the clear header — the words centred on the warm left half, the lead print framed
 * on the grey right half — a picture only: nothing under it, and not a link (the owner's feedback
 * of 2026-11-19, TASKS.md 28.2). The picture is the one the editor chose for the block, or else the first of the home's featured
 * products with a published image — the same cached read as the "Begin with these" rail, so no
 * second query. Until that read lands, or while the shop holds no product, the bare well keeps its
 * place. The words are the page's `homeHero` block (the CMS); the placeholder is the lexicon's.
 */
import { Suspense, type ReactNode } from 'react'

import { Button, PrintTile, PrintTileNote, ResponsiveImage, printAspectOf } from '@engine/ui'
import { productText } from '../product/copy'
import { imageAlt } from '../product/synthetic'
import { Caps, CapsLink } from '../ui/caps-link'
import {
  loadFeaturedProducts,
  type FeaturedProduct,
} from '../../../server/shop/home/load-featured-products'
import type { CatalogueImage } from '../../../server/shop/catalogue/view-models'
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
  // The editor's chosen picture (TASKS.md 27.5.d): drawn as it is, no product read, no caption.
  if (props.block.image !== null) {
    return <Frame {...props} print={<Chosen locale={props.locale} image={props.block.image} />} />
  }
  return (
    <Suspense fallback={<Frame {...props} pending print={<Empty />} />}>
      <LeadPrint {...props} />
    </Suspense>
  )
}

type FrameProps = Props & {
  readonly print: ReactNode
  /**
   * The placeholder while the read streams. Its title is the page's h1 too, so the page is never
   * without one, but without the id: the finished hero streams in hidden until it replaces this
   * one, so one h1 is ever exposed and no id is ever doubled.
   */
  readonly pending?: boolean
}

function Frame({ block, print, pending = false }: FrameProps) {
  return (
    <section className={styles.hero} aria-labelledby={pending ? undefined : 'home-title'}>
      <div className={styles.words}>
        <div className={styles.block}>
          <h1 id={pending ? undefined : 'home-title'} className={styles.title}>
            {block.title}
          </h1>
          {block.lede ? <p className={`site-lede ${styles.lede}`}>{block.lede}</p> : null}
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
      <div className={styles.wall}>{print}</div>
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

function Chosen({ locale, image }: { locale: 'en' | 'id'; image: CatalogueImage }) {
  const ratio = windowRatio(image)
  return (
    <PrintTile ratio={ratio} className={styles.tile}>
      {/* The page's largest paint: preloaded at high priority. */}
      <ResponsiveImage
        variant="fill"
        aspectRatio={printAspectOf(ratio)}
        src={image.url}
        srcSet={image.srcSet}
        sizes="(max-width: 56.25rem) 80vw, 40vw"
        alt={imageAlt(productText(locale), image)}
        priority
        unoptimized
      />
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
  if (lead.image === null) return <Frame {...props} print={<Empty note={lead.name} />} />
  return <Frame {...props} print={<Chosen locale={locale} image={lead.image} />} />
}
