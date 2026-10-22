/**
 * A listing card (the redesign of 2026-10-20): the shop's `ShopCard` — the print framed on its
 * well, the name and the price ("From Rp …" when variants are priced apart) on the first row,
 * Reproduction under it, and a badge on the well for Sold out or a synthetic image's label.
 * Everything it says comes from the loader view model and the lexicon; a storefront link is a plain
 * <a>, because prefetching a listing page costs a database read (ARCHITECTURE.md §6).
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ProductCardVM } from '../../../server/shop/catalogue/view-models'
import { Price, ResponsiveImage, printAspectOf, printRatioOf } from '../../../shared/ui'
import { formatRupiah } from '../../../shared/ui/price/format-rupiah'
import { productText } from '../product/copy'
import { imageAlt, syntheticLabelText } from '../product/synthetic'
import { ShopCard } from '../ui/shop-card'
import { browseText } from './copy'

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
  const ratio = printRatioOf(product.image)
  const synthetic = product.image ? syntheticLabelText(words, product.image) : null
  return (
    <ShopCard
      href={href}
      ratio={ratio}
      title={product.name}
      badge={!product.available ? text('listing.soldOut') : synthetic}
      aside={
        from ? (
          text.shared('price.from', { price: formatRupiah(product.fromPrice) })
        ) : product.price !== null ? (
          <Price amount={product.price} />
        ) : undefined
      }
      meta={
        <>
          <span>{text.shared('label.reproduction')}</span>
          {synthetic !== null && !product.available && <span>{synthetic}</span>}
        </>
      }
      picture={
        product.image ? (
          <ResponsiveImage
            variant="fill"
            aspectRatio={printAspectOf(ratio)}
            src={product.image.url}
            srcSet={product.image.srcSet}
            alt={imageAlt(words, product.image)}
            sizes="(max-width: 56.25rem) 47vw, 24vw"
            priority={lead}
            unoptimized
          />
        ) : null
      }
    />
  )
}
