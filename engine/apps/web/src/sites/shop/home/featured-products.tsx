/**
 * The shop home's best sellers (ticket 4.3.b; Ivory and ink 18.4): a streamed grid of published
 * products, each print hung on an even stone tile (the shared `PrintTile`) with a museum caption. The read is `loadFeaturedProducts()`
 * (`server/shop/home`), public-only, with prices formatted through `formatRupiah`; inside
 * `<Suspense>` with a skeleton, and an empty state when the database holds no published product
 * yet — never a crash.
 */
import { Suspense } from 'react'

import { Price, PrintTile, PrintTileNote, Skeleton, printRatioOf } from '../../../shared/ui'
import { productText } from '../product/copy'
import { imageAlt, syntheticLabelText } from '../product/synthetic'

import {
  loadFeaturedProducts,
  type FeaturedProduct,
} from '../../../server/shop/home/load-featured-products'
import styles from './home.module.css'
import type { HomeText } from './home-messages'

type Props = {
  readonly locale: 'en' | 'id'
  readonly t: HomeText
}

export function FeaturedProducts(props: Props) {
  return (
    <Suspense fallback={<ProductsSkeleton />}>
      <ProductsGrid {...props} />
    </Suspense>
  )
}

function ProductsSkeleton() {
  return (
    <div className={styles.four} aria-hidden="true">
      {[0, 1, 2, 3].map((at) => (
        <div key={at}>
          <PrintTile>
            <Skeleton width="100%" height="100%" />
          </PrintTile>
          <Skeleton width="70%" height="1.25rem" />
          <Skeleton width="45%" height="1rem" />
        </div>
      ))}
    </div>
  )
}

async function ProductsGrid({ locale, t }: Props) {
  let products: readonly FeaturedProduct[] = []
  try {
    products = await loadFeaturedProducts(locale)
  } catch {
    products = []
  }
  if (products.length === 0) {
    return (
      <div className={styles.sectionBody}>
        <h3 className={styles.cardTitle}>{t('home.shop.emptyTitle')}</h3>
        <p className={styles.cardBody}>{t('home.shop.emptyBody')}</p>
      </div>
    )
  }
  const words = productText(locale)
  return (
    <div className={styles.four}>
      {products.map((product) => {
        const label = product.image ? syntheticLabelText(words, product.image) : null
        return (
          <a className={styles.productCard} key={product.slug} href={`/product/${product.slug}`}>
            <PrintTile ratio={printRatioOf(product.image)}>
              {product.image ? (
                // The public derivative (`server/media/public-image`), a plain `<img>` since it
                // never goes through `next/image`'s optimizer or its remote-pattern allowlist; its
                // srcSet is the derivative ladder, so a phone fetches a small width (10.6).
                <img
                  src={product.image.url}
                  srcSet={product.image.srcSet}
                  sizes="(max-width: 47.5rem) 40vw, (max-width: 75rem) 26vw, 20vw"
                  loading="lazy"
                  decoding="async"
                  alt={imageAlt(words, product.image)}
                />
              ) : (
                <PrintTileNote>{product.name}</PrintTileNote>
              )}
            </PrintTile>
            <h3 className={styles.cardTitle}>{product.name}</h3>
            {label !== null && <p className={styles.cardBody}>{label}</p>}
            <p className={styles.cardPrice}>
              {t('home.shop.pricePrefix')} <Price amount={product.price} />
            </p>
          </a>
        )
      })}
    </div>
  )
}
