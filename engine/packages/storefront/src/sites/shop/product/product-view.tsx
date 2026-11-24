/**
 * The product page (6.1.b; the redesign of 2026-10-20, the handoff's King & McGaw skeleton): a
 * 12-column grid. Columns 1–6 hold the gallery — the print framed on a white stage, the other views
 * under it, Enlarge. Columns 8–12 hold the details: the name large, its collection as a link, the
 * reference line, the price and the sizes (each its own price, which changes with the choice), Add
 * to bag, the stock, the delivery note and the original it was made from — the two proof points
 * are gone (the owner's feedback of 2026-11-19, TASKS.md 28.2). "About this product" follows in columns
 * 2–6. The words come from the lexicon, the fixed ones from the settings (`./page-copy`); the prices are whole rupiah the server formats.
 * Above it all, the same-day promise, as on the shop's listing: the owner asked for it "on landing
 * page and shop pages", and "Shop pages" is the feedback's own heading for this page's points.
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import type { CatalogueImage, ProductVM } from '../../../server/shop/catalogue/view-models'
import { PrintTile, PrintTileNote, printAspectOf, printRatioOf } from '@engine/ui/print-tile'
import { ResponsiveImage } from '@engine/ui/responsive-image'
import { TextLink } from '@engine/ui/text-link'
import { ChatPageContext } from '@engine/chat/client/page-context'
import { formatRupiah } from '@engine/ui/format-rupiah'
import { GALLERY_LIVE, GALLERY_LIVE_LINK } from '../gallery-live'
import { productText, variantPickerText, type ProductText } from './copy'
import { productPageCopy, type ProductPageCopy } from './page-copy'
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
  pageCopy,
  original = null,
  banner = null,
}: {
  readonly product: ProductVM
  readonly locale: SiteLocale
  /** The shop-all address; the page draws no breadcrumb (the category is a link under the name). */
  readonly shopHref: string
  /** The product's category page, when it has one. */
  readonly categoryHref: string | null
  /** The owner’s fixed words (`site-settings.shop.productPage`); the lexicon’s when absent. */
  readonly pageCopy?: ProductPageCopy
  /**
   * "See the original": the shop app's link to the antique the print is made from, resolved by the
   * gallery from the product's stock number (TASKS.md 23.5); `null` draws nothing of its own.
   */
  readonly original?: React.ReactNode
  /** The same-day promise across the top (`../sections/promo`); `null` draws none. */
  readonly banner?: React.ReactNode
}): React.ReactElement {
  const text = productText(locale)
  const copy = pageCopy ?? productPageCopy(text, null, null)
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
      {banner ? <div className={styles.banner}>{banner}</div> : null}
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
            text={variantPickerText(text, finishes, copy.finishHelp)}
            variants={variants}
            productPriceText={priceText}
            available={product.available}
            bagHref={bagHref}
          />

          <p className={styles.delivery}>{copy.delivery}</p>

          {original}
          {original === null && product.relatedWork && (
            <p className={styles.original}>
              {text('product.original', { title: product.relatedWork.title })}{' '}
              {/* For now the owner's live gallery site, in a new tab (`../gallery-live`); the
                  related work's own address again once the new gallery launches. */}
              <TextLink {...GALLERY_LIVE_LINK}>
                {GALLERY_LIVE.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </TextLink>
            </p>
          )}
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
