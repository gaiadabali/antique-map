/**
 * The shop home's "Begin with these" (the redesign of 2026-10-20): the featured products as a rail
 * of framed cards — name and price, then "Reproduction" — with "Shop all prints" under it. The read
 * is `loadFeaturedProducts()` (`server/shop/home`), public-only, prices formatted through
 * `formatRupiah`; inside `<Suspense>`, and an empty state when the database holds no published
 * product yet — never a crash.
 */
import { Suspense } from 'react'

import { createHref, SITES } from '@engine/config/sites'

import { Price, ResponsiveImage, printAspectOf, printRatioOf } from '../../../shared/ui'
import { productText } from '../product/copy'
import { imageAlt, syntheticLabelText } from '../product/synthetic'
import {
  loadFeaturedProducts,
  type FeaturedProduct,
} from '../../../server/shop/home/load-featured-products'
import { CapsLink } from '../ui/caps-link'
import { Rail } from '../ui/rail'
import { RailSkeleton } from '../ui/rail-skeleton'
import { ShopCard } from '../ui/shop-card'
import styles from './home.module.css'
import type { HomeText } from './home-messages'

type Props = {
  readonly locale: 'en' | 'id'
  readonly t: HomeText
  /** The browse page, reached from the link under the rail. */
  readonly allHref: string
}

export function FeaturedProducts(props: Props) {
  return (
    <Suspense fallback={<RailSkeleton title={props.t('home.shop.featuredTitle')} flush />}>
      <ProductsRail {...props} />
    </Suspense>
  )
}

async function ProductsRail({ locale, t, allHref }: Props) {
  let products: readonly FeaturedProduct[] = []
  try {
    products = await loadFeaturedProducts(locale)
  } catch {
    products = []
  }
  if (products.length === 0) {
    return (
      <section className={styles.empty} aria-labelledby="home-featured">
        <h2 id="home-featured" className={styles.emptyTitle}>
          {t('home.shop.emptyTitle')}
        </h2>
        <p className={styles.emptyBody}>{t('home.shop.emptyBody')}</p>
      </section>
    )
  }
  const words = productText(locale)
  const href = createHref(SITES.shop)
  return (
    <Rail
      id="home-featured"
      title={t('home.shop.featuredTitle')}
      previousLabel={t('home.shop.railPrevious')}
      nextLabel={t('home.shop.railNext')}
      more={<CapsLink href={allHref}>{t('home.shop.shopAll')}</CapsLink>}
      flush
    >
      {products.map((product) => {
        const ratio = printRatioOf(product.image)
        return (
          <ShopCard
            key={product.slug}
            href={href('product', { slug: product.slug }, locale)}
            ratio={ratio}
            title={product.name}
            badge={product.image ? syntheticLabelText(words, product.image) : null}
            aside={
              <>
                {t('home.shop.pricePrefix')} <Price amount={product.price} />
              </>
            }
            meta={words.shared('label.reproduction')}
            picture={
              product.image ? (
                <ResponsiveImage
                  variant="fill"
                  aspectRatio={printAspectOf(ratio)}
                  src={product.image.url}
                  srcSet={product.image.srcSet}
                  alt={imageAlt(words, product.image)}
                  sizes="(max-width: 56.25rem) 45vw, 24vw"
                  unoptimized
                />
              ) : null
            }
          />
        )
      })}
    </Rail>
  )
}
