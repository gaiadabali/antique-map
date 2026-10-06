/**
 * The shop home's best sellers (ticket 4.3.b): a streamed grid of published products. The read is
 * `loadFeaturedProducts()` (`server/shop/home`), public-only, with prices formatted through
 * `formatRupiah`; inside `<Suspense>` with a skeleton, and an empty state when the database holds
 * no published product yet — never a crash.
 */
import { Suspense } from 'react'

import { Price, Skeleton } from '../../../shared/ui'

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
          <Skeleton width="100%" height="12rem" />
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
      <div>
        <h3>{t('home.shop.emptyTitle')}</h3>
        <p className={styles.cardBody}>{t('home.shop.emptyBody')}</p>
      </div>
    )
  }
  return (
    <div className={styles.four}>
      {products.map((product, at) => (
        <a className={styles.productCard} key={product.slug} href={`/product/${product.slug}`}>
          {product.imageUrl ? (
            // The public derivative (`server/media/public-image`), a plain `<img>` since it never
            // goes through `next/image`'s optimizer or its remote-pattern allowlist.
            <img
              className={styles.plate}
              style={{ aspectRatio: '4 / 5', objectFit: 'cover' }}
              src={product.imageUrl}
              alt={product.imageAlt}
            />
          ) : (
            <span className={styles.plate} style={{ aspectRatio: '4 / 5' }} aria-hidden="true" />
          )}
          <span className={styles.num} style={{ marginTop: 'var(--space-3)', display: 'block' }}>
            {`0${at + 1}/`}
          </span>
          <h3 className={styles.cardTitle}>{product.name}</h3>
          <p className={styles.cardBody}>
            {t('home.shop.pricePrefix')} <Price amount={product.price} />
          </p>
        </a>
      ))}
    </div>
  )
}
