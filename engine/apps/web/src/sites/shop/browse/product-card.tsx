/**
 * A listing card (EXPERIENCE-SHOP.md §4; Ivory and ink): the print on its even tile, then the name,
 * one muted line (Reproduction, the synthetic label, Sold out) and the price ("From Rp …" when
 * variants are priced apart). Everything it says comes from the loader view model and the lexicon;
 * a storefront link is a plain <a>, because prefetching a listing page costs a database read
 * (ARCHITECTURE.md §6).
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ProductCardVM } from '../../../server/shop/catalogue/view-models'
import {
  Price,
  PrintTile,
  PrintTileNote,
  ResponsiveImage,
  printAspectOf,
  printRatioOf,
} from '../../../shared/ui'
import { formatRupiah } from '../../../shared/ui/price/format-rupiah'
import { productText } from '../product/copy'
import { imageAlt, syntheticLabelText } from '../product/synthetic'
import { browseText } from './copy'
import styles from './browse.module.css'

export function ProductCard({
  product,
  locale,
  href,
  lead = false,
}: {
  readonly product: ProductCardVM
  readonly locale: SiteLocale
  readonly href: string
  /** A card of the first row, above the fold: its image is fetched eagerly, at high priority. */
  readonly lead?: boolean
}): React.ReactElement {
  const text = browseText(locale)
  const words = productText(locale)
  const from = product.fromPrice !== null && product.fromPrice !== product.price
  const priceText = from
    ? text.shared('price.from', { price: formatRupiah(product.fromPrice) })
    : null
  const ratio = printRatioOf(product.image)
  return (
    <a href={href} className={styles.card}>
      <PrintTile ratio={ratio}>
        {product.image ? (
          <ResponsiveImage
            variant="fill"
            aspectRatio={printAspectOf(ratio)}
            src={product.image.url}
            srcSet={product.image.srcSet}
            alt={imageAlt(words, product.image)}
            sizes="(min-width: 110rem) 18vw, (min-width: 75rem) 23vw, (min-width: 48rem) 31vw, 47vw"
            priority={lead}
            unoptimized
          />
        ) : (
          <PrintTileNote>{product.name}</PrintTileNote>
        )}
      </PrintTile>
      <span className={styles.cardBody}>
        <span className={styles.cardTitle}>{product.name}</span>
        <span className={styles.cardMeta}>
          <span>{text.shared('label.reproduction')}</span>
          {product.image && syntheticLabelText(words, product.image) !== null && (
            <span>{syntheticLabelText(words, product.image)}</span>
          )}
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
