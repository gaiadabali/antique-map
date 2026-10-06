/**
 * A listing tile (EXPERIENCE-SHOP.md §4): image, name, price ("From Rp …" when variants are
 * priced apart), Reproduction, and "Sold out" when no active store holds a unit. Everything it
 * says comes from the loader's view model and the lexicon; a storefront link is a plain `<a>` —
 * prefetching a listing page costs a database read (ARCHITECTURE.md §6).
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ProductCardVM } from '../../../server/shop/catalogue/view-models'
import { Price, ResponsiveImage } from '../../../shared/ui'
import { formatRupiah } from '../../../shared/ui/price/format-rupiah'
import { browseText } from './copy'
import styles from './browse.module.css'

export function ProductCard({
  product,
  locale,
  href,
}: {
  readonly product: ProductCardVM
  readonly locale: SiteLocale
  readonly href: string
}): React.ReactElement {
  const text = browseText(locale)
  const from = product.fromPrice !== null && product.fromPrice !== product.price
  const priceText = from
    ? text.shared('price.from', { price: formatRupiah(product.fromPrice) })
    : null
  return (
    <a href={href} className={styles.card}>
      {product.image ? (
        <ResponsiveImage
          variant="fill"
          aspectRatio="4 / 3"
          src={product.image.url}
          alt={product.image.alt}
          sizes="(max-width: 767px) 50vw, 25vw"
          className={styles.image}
          unoptimized
        />
      ) : (
        <div className={`${styles.image} ${styles.imageEmpty}`} aria-hidden="true" />
      )}
      <span className={styles.cardBody}>
        <span className={styles.cardTitle}>{product.name}</span>
        <span className={styles.cardMeta}>
          <span className={styles.reproduction}>{text.shared('label.reproduction')}</span>
          {!product.available && <span className={styles.soldOut}>{text('listing.soldOut')}</span>}
        </span>
        {priceText !== null ? (
          <span className={styles.priceFrom}>{priceText}</span>
        ) : product.price !== null ? (
          <Price amount={product.price} className={styles.price} />
        ) : null}
      </span>
    </a>
  )
}
