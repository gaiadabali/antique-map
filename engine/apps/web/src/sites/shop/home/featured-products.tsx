/**
 * The shop home's "Begin with these" (the redesign of 2026-10-20): the featured products as a rail
 * of framed cards — name and price, then "Reproduction" — with "Shop all prints" under it. The read
 * is `loadFeaturedProducts()` (`server/shop/home`), public-only, prices formatted through
 * `formatRupiah`; inside `<Suspense>`, and an empty state when the database holds no published
 * product yet — never a crash. The words are the page's `productRail` block; the arrows and the
 * "From" before a price are the lexicon's.
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
import type { ProductRailVM } from '../../../server/shop/pages/blocks'
import styles from './home.module.css'
import type { HomeText } from './home-messages'

type Props = {
  readonly locale: 'en' | 'id'
  readonly t: HomeText
  readonly block: ProductRailVM
  /** The browse page, reached from the link under the rail. */
  readonly allHref: string
}

export function FeaturedProducts(props: Props) {
  return (
    <Suspense fallback={<RailSkeleton title={props.block.title} flush />}>
      <ProductsRail {...props} />
    </Suspense>
  )
}

async function ProductsRail({ locale, t, block, allHref }: Props) {
  let products: readonly FeaturedProduct[] = []
  try {
    products = await loadFeaturedProducts(locale, block.categoryId)
  } catch {
    products = []
  }
  if (products.length === 0) {
    return (
      <section className={styles.empty} aria-labelledby={`rail-${block.id}`}>
        <h2 id={`rail-${block.id}`} className={styles.emptyTitle}>
          {block.emptyTitle || block.title}
        </h2>
        {block.emptyBody ? <p className={styles.emptyBody}>{block.emptyBody}</p> : null}
      </section>
    )
  }
  const words = productText(locale)
  const href = createHref(SITES.shop)
  return (
    <Rail
      id={`rail-${block.id}`}
      title={block.title}
      previousLabel={t('home.shop.railPrevious')}
      nextLabel={t('home.shop.railNext')}
      more={block.linkLabel ? <CapsLink href={allHref}>{block.linkLabel}</CapsLink> : undefined}
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
