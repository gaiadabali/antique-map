/**
 * The product page (6.1.b; the redesign of 2026-10-20, the handoff's King & McGaw skeleton): a
 * 12-column grid. Columns 1–6 hold the gallery — the print framed on a white stage, the other views
 * under it, Enlarge. Columns 8–12 hold the details: the name large, its collection as a link, the
 * reference line, the price and options, Add to bag, the stock, the delivery note, the original it
 * was made from, and the two proof points as ruled rows. "About this product" follows in columns
 * 2–6. The words come from the lexicon; the prices are whole rupiah the server formats.
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import type { CatalogueImage, ProductVM } from '../../../server/shop/catalogue/view-models'
import {
  PrintTile,
  PrintTileNote,
  ResponsiveImage,
  TextLink,
  printAspectOf,
  printRatioOf,
} from '../../../shared/ui'
import { ChatPageContext } from '../../../shared/chat/chat-page-context'
import { formatRupiah } from '../../../shared/ui/price/format-rupiah'
import { GALLERY_LIVE, GALLERY_LIVE_LINK } from '../gallery-live'
import { productText, variantPickerText, type ProductText } from './copy'
import { ProductGallery, type GalleryView } from './product-gallery'
import styles from './product.module.css'
import { imageAlt, syntheticLabelText } from './synthetic'
import { VariantPicker, type PickerVariant } from './variant-picker'

/** Options that are the shop's finishes get the "?" that explains them. */
const FINISH = /\b(mounted|framed)\b/i

export function ProductView({
  product,
  locale,
  categoryHref,
}: {
  readonly product: ProductVM
  readonly locale: SiteLocale
  /** The shop-all address; the page draws no breadcrumb (the category is a link under the name). */
  readonly shopHref: string
  /** The product's category page, when it has one. */
  readonly categoryHref: string | null
}): React.ReactElement {
  const text = productText(locale)
  const bagHref = createHref(SITES.shop)('cart', {}, locale)
  const variants: readonly PickerVariant[] = product.variants.map((variant) => ({
    sku: variant.sku,
    label: variant.label,
    price: variant.price,
    priceText:
      variant.price !== null
        ? formatRupiah(variant.price)
        : product.price !== null
          ? formatRupiah(product.price)
          : null,
    available: variant.available,
  }))
  const priceText =
    product.price !== null &&
    product.variants.length > 0 &&
    variants.some((v) => v.price !== null && v.price !== product.price)
      ? text.shared('price.from', { price: formatRupiah(lowestOf(product)) })
      : product.price !== null
        ? formatRupiah(product.price)
        : null
  const finishes = variants.length > 0 && variants.every((variant) => FINISH.test(variant.label))
  return (
    <article className={styles.page} aria-labelledby="product-title">
      <ChatPageContext title={product.name} />
      <div className={styles.layout}>
        <div className={styles.gallery}>
          <ProductGallery
            views={product.images.map((image, index) => galleryView(text, image, index))}
            empty={
              // No picture yet: the name stands on the stage as type.
              <PrintTile>
                <PrintTileNote>{product.name}</PrintTileNote>
              </PrintTile>
            }
            enlargeLabel={text('product.enlarge')}
            dialogTitle={text('product.enlargeTitle', { name: product.name })}
            caption={product.name}
            closeLabel={text('product.closeEnlarge')}
            viewsLabel={text('product.views')}
          />
        </div>

        <div className={styles.copy}>
          <h1 id="product-title" className={styles.name}>
            {product.name}
          </h1>
          {product.category &&
            (categoryHref ? (
              <a className={styles.category} href={categoryHref}>
                {product.category.label}
              </a>
            ) : (
              <span className={styles.category}>{product.category.label}</span>
            ))}
          <p className={styles.meta}>
            {text.shared('label.reproduction')} · {text('product.sku', { sku: product.sku })}
          </p>

          <VariantPicker
            productId={product.id}
            sku={product.sku}
            text={variantPickerText(text, finishes)}
            variants={variants}
            productPriceText={priceText}
            available={product.available}
            bagHref={bagHref}
          />

          <p className={styles.delivery}>{text('product.delivery')}</p>

          {product.relatedWork && (
            <p className={styles.original}>
              {text('product.original', { title: product.relatedWork.title })}{' '}
              {/* For now the owner's live gallery site, in a new tab (`../gallery-live`); the
                  related work's own address again once the new gallery launches. */}
              <TextLink {...GALLERY_LIVE_LINK}>
                {GALLERY_LIVE.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </TextLink>
            </p>
          )}

          <ul className={styles.proof}>
            {[text('product.signalPaper'), text('product.signalWorkshop')].map((line) => (
              <li key={line}>
                <span>{line}</span>
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  aria-hidden="true"
                >
                  <path d="M1 6h10" />
                </svg>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Under the picture and the buy block: a warm band, the title at the left, the words in the
          details' column at the right. */}
      {product.description !== '' && (
        <section className={styles.story} aria-labelledby="product-story">
          <div className={styles.storyInner}>
            <h2 id="product-story" className={styles.storyTitle}>
              {text('product.description')}
            </h2>
            <p className={styles.storyText}>{product.description}</p>
          </div>
        </section>
      )}
    </article>
  )
}

/** One image as the gallery shows it: on the stage, as a thumbnail, and enlarged. */
function galleryView(text: ProductText, image: CatalogueImage, index: number): GalleryView {
  const ratio = printRatioOf(image)
  const picture = (sizes: string, priority = false) => (
    <ResponsiveImage
      variant="fill"
      aspectRatio={printAspectOf(ratio)}
      src={image.url}
      srcSet={image.srcSet}
      alt={imageAlt(text, image)}
      sizes={sizes}
      priority={priority}
      unoptimized
    />
  )
  return {
    stage: (
      <PrintTile ratio={ratio}>
        {picture('(max-width: 56.25rem) 90vw, 45vw', index === 0)}
      </PrintTile>
    ),
    thumb: <PrintTile ratio={ratio}>{picture('72px')}</PrintTile>,
    large: <PrintTile ratio={ratio}>{picture('90vw')}</PrintTile>,
    note: syntheticLabelText(text, image),
    label: text('product.view', { n: String(index + 1) }),
  }
}

/** The lowest price on offer: a variant's, when any is priced away from the product's own. */
function lowestOf(product: ProductVM): number {
  const prices = product.variants
    .map((variant) => variant.price ?? product.price)
    .filter((price): price is number => price !== null)
  return Math.min(...(product.price !== null ? [product.price, ...prices] : prices))
}
