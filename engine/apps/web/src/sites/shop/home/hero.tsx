/**
 * The shop home's hero: the headline and its proof points beside the lead print, set in a paper
 * mat and captioned the way a gallery labels a wall. The print is the first of the home's featured
 * products with a published image — the same cached read as the best-seller rail, so no second
 * query. Until that read lands, or while the shop holds no product, the mat keeps its place with an
 * empty window. Every word comes from the shop's lexicon.
 */
import { Suspense, type ReactNode } from 'react'

import { Button, Eyebrow, Price, Skeleton } from '../../../shared/ui'
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

export function Hero({ locale, shopHref, t }: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.mark}>
          <span className={styles.scale} aria-hidden="true" />
          <Eyebrow>{t('home.shop.eyebrow')}</Eyebrow>
        </p>
        <h1 className={styles.title}>{t('home.shop.title')}</h1>
        <p className={`site-lede ${styles.lede}`}>{t('home.shop.lede')}</p>
        <div className={styles.actions}>
          <Button variant="primary" href={shopHref}>
            {t('home.shop.ctaShop')}
          </Button>
          <Button variant="quiet" href="#process">
            {t('home.shop.ctaProcess')}
          </Button>
        </div>
      </div>
      <Suspense
        fallback={
          <Frame
            caption={
              <div className={styles.caption} aria-hidden="true">
                <Skeleton width="60%" height="1.5rem" />
              </div>
            }
          />
        }
      >
        <LeadPrint locale={locale} t={t} />
      </Suspense>
      <ul className={styles.signals}>
        {SIGNALS.map((key) => (
          <li key={key}>
            <Eyebrow>{t(key)}</Eyebrow>
          </li>
        ))}
      </ul>
    </section>
  )
}

async function LeadPrint({ locale, t }: Pick<Props, 'locale' | 't'>) {
  let products: readonly FeaturedProduct[] = []
  try {
    products = await loadFeaturedProducts(locale)
  } catch {
    products = []
  }
  const lead = products.find((product) => product.image !== null) ?? products[0]
  if (lead === undefined) {
    return (
      <Frame>
        <span className={styles.empty}>{t('home.shop.heroA')}</span>
      </Frame>
    )
  }
  const words = productText(locale)
  const label = lead.image === null ? null : syntheticLabelText(words, lead.image)
  return (
    <Frame
      ratio={windowRatio(lead.image)}
      caption={
        <figcaption className={styles.caption}>
          <span className={styles.captionText}>
            <a className={styles.captionTitle} href={`/product/${lead.slug}`}>
              {lead.name}
            </a>
            {label !== null && <span className={styles.captionMeta}>{label}</span>}
          </span>
          <span className={styles.captionMeta}>
            {t('home.shop.pricePrefix')} <Price amount={lead.price} />
          </span>
        </figcaption>
      }
    >
      {lead.image === null ? (
        <span className={styles.empty}>{t('home.shop.heroA')}</span>
      ) : (
        // The public derivative, a plain `<img>` as the rail's cards use (`./featured-products`);
        // eager and high priority, since it is the page's largest paint.
        <img
          className={styles.image}
          src={lead.image.url}
          srcSet={lead.image.srcSet}
          sizes="(max-width: 47.5rem) 100vw, min(45vw, 34rem)"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          alt={imageAlt(words, lead.image)}
        />
      )}
    </Frame>
  )
}

type FrameProps = {
  /** The window's width over its height; square until the print's own shape is known. */
  readonly ratio?: number
  readonly caption?: ReactNode
  readonly children?: ReactNode
}

function Frame({ ratio = 1, caption, children }: FrameProps) {
  return (
    <figure className={styles.frame}>
      <div className={styles.mat}>
        <div className={styles.window} style={{ aspectRatio: ratio }}>
          {children}
        </div>
      </div>
      {caption}
    </figure>
  )
}
