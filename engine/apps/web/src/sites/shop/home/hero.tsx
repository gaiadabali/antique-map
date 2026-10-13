/**
 * The shop home's hero (12.1; Cobalt 19.1): the headline in white on the cobalt field, and the
 * lead print hung across the field's lower edge onto the paper (the shared `Crossing`), captioned
 * the way a gallery labels a wall — its name, its label and its price. The print is the first of
 * the home's featured products with a published image — the same cached read as the best-seller
 * rail, so no second query. Until that read lands, or while the shop holds no product, a window of
 * the field's tint keeps its place. Every word comes from the shop's lexicon.
 */
import { Suspense, type ReactNode } from 'react'

import {
  Button,
  Crossing,
  MatNote,
  Price,
  ProofPoints,
  ResponsiveImage,
  Skeleton,
} from '../../../shared/ui'
import { productText } from '../product/copy'
import { imageAlt, syntheticLabelText } from '../product/synthetic'

import {
  loadFeaturedProducts,
  type FeaturedProduct,
} from '../../../server/shop/home/load-featured-products'
import { windowRatio } from './frame-ratio'
import styles from './hero.module.css'
import type { HomeText } from './home-messages'

const SIGNALS = [
  'home.shop.signalRestored',
  'home.shop.signalBali',
  'home.shop.signalShops',
] as const

type Props = {
  readonly locale: 'en' | 'id'
  /** The shop's browse page in the visitor's locale. */
  readonly shopHref: string
  readonly t: HomeText
}

export function Hero(props: Props) {
  return (
    <Suspense
      fallback={
        <Frame
          {...props}
          pending
          ratio={1}
          picture={<div className={styles.empty} style={{ aspectRatio: 1 }} />}
          caption={<Skeleton width="60%" height="1.5rem" />}
        />
      }
    >
      <LeadPrint {...props} />
    </Suspense>
  )
}

type FrameProps = Props & {
  readonly ratio: number
  readonly picture: ReactNode
  readonly caption?: ReactNode
  /**
   * The placeholder while the read streams: its title is plain text, not the page's heading, so the
   * page never holds two h1s (or two ids) in the moment the finished hero replaces it.
   */
  readonly pending?: boolean
}

/** The hero around whatever print it holds: the copy and signals never wait on the read. */
function Frame({ shopHref, t, ratio, picture, caption, pending = false }: FrameProps) {
  const Title = pending ? 'p' : 'h1'
  return (
    <Crossing
      lead
      pigment={2}
      strength="full"
      fit="cover"
      ratio={ratio}
      aria-labelledby={pending ? undefined : 'home-title'}
      copy={
        <>
          <Title id={pending ? undefined : 'home-title'} className={styles.title}>
            {t('home.shop.title')}
          </Title>
          <p className={`site-lede ${styles.lede}`}>{t('home.shop.lede')}</p>
          <div className={styles.actions}>
            <Button variant="primary" href={shopHref}>
              {t('home.shop.ctaShop')}
            </Button>
            <Button variant="quiet" href="#process">
              {t('home.shop.ctaProcess')}
            </Button>
          </div>
          <ProofPoints className={styles.signals} items={SIGNALS.map((key) => t(key))} />
        </>
      }
      picture={picture}
      caption={caption}
    />
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
  const placeholder = (
    <div className={styles.empty} style={{ aspectRatio: 1 }}>
      <MatNote>{t('home.shop.heroA')}</MatNote>
    </div>
  )
  if (lead === undefined) return <Frame {...props} ratio={1} picture={placeholder} />
  const words = productText(locale)
  const label = lead.image === null ? null : syntheticLabelText(words, lead.image)
  const caption = (
    <>
      <a className={styles.captionTitle} href={`/product/${lead.slug}`}>
        {lead.name}
      </a>
      {label !== null && <span className={styles.captionMeta}>{label}</span>}
      <span className={styles.captionPrice}>
        {t('home.shop.pricePrefix')} <Price amount={lead.price} />
      </span>
    </>
  )
  if (lead.image === null) {
    return <Frame {...props} ratio={1} picture={placeholder} caption={caption} />
  }
  const ratio = windowRatio(lead.image)
  return (
    <Frame
      {...props}
      ratio={ratio}
      caption={caption}
      picture={
        // The print opens its page too; the caption's name is the one link in the tab order.
        <a
          className={styles.printLink}
          href={`/product/${lead.slug}`}
          tabIndex={-1}
          aria-hidden="true"
        >
          {/* The page's largest paint: preloaded at high priority, AVIF where the browser takes it. */}
          <ResponsiveImage
            variant="fill"
            aspectRatio={`${ratio} / 1`}
            src={lead.image.url}
            srcSet={lead.image.srcSet}
            sizes="(max-width: 63.99rem) 100vw, 55vw"
            alt={imageAlt(words, lead.image)}
            priority
            unoptimized
          />
        </a>
      }
    />
  )
}
