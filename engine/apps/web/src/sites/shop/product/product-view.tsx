/**
 * The product page (6.1.b; EXPERIENCE-SHOP.md §4), in the luxury pass (12.5): the matted pictures on the left, the details (category, name, price,
 * options, add to bag, delivery, proof points) sticky on the right, the story below; one column on
 * a phone. The words come from the lexicon; the prices are whole rupiah the server formats.
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import type { ProductVM } from '../../../server/shop/catalogue/view-models'
import {
  Breadcrumbs,
  Eyebrow,
  Mat,
  ProofPoints,
  ResponsiveImage,
  SectionHead,
  TextLink,
} from '../../../shared/ui'
import { ChatPageContext } from '../../../shared/chat/chat-page-context'
import { formatRupiah } from '../../../shared/ui/price/format-rupiah'
import { productText, variantPickerText } from './copy'
import styles from './product.module.css'
import { imageAlt, syntheticLabelText } from './synthetic'
import { VariantPicker, type PickerVariant } from './variant-picker'

export function ProductView({
  product,
  locale,
  shopHref,
  categoryHref,
}: {
  readonly product: ProductVM
  readonly locale: SiteLocale
  /** The shop-all address, for the breadcrumb. */
  readonly shopHref: string
  /** The product's category page, when it has one. */
  readonly categoryHref: string | null
}): React.ReactElement {
  const text = productText(locale)
  const bagHref = createHref(SITES.shop)('cart', {}, locale)
  const [lead, ...rest] = product.images
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
  return (
    <article className={styles.page}>
      <ChatPageContext title={product.name} />
      <div className={styles.crumbs}>
        <Breadcrumbs
          items={[
            { label: text('product.breadcrumbShop'), href: shopHref },
            ...(categoryHref && product.category
              ? [{ label: product.category.label, href: categoryHref }]
              : []),
            { label: product.name },
          ]}
        />
      </div>

      <div className={styles.layout}>
        <div className={styles.gallery}>
          {lead && (
            <figure className={styles.figure}>
              <Mat>
                <ResponsiveImage
                  variant="fill"
                  aspectRatio="1 / 1"
                  src={lead.url}
                  srcSet={lead.srcSet}
                  alt={imageAlt(text, lead)}
                  sizes="(max-width: 767px) 100vw, 58vw"
                  priority
                  unoptimized
                />
              </Mat>
              <Label text={syntheticLabelText(text, lead)} />
            </figure>
          )}
          {rest.length > 0 && (
            <div className={styles.thumbs}>
              {rest.map((image) => (
                <figure key={image.url} className={styles.figure}>
                  <Mat size="compact">
                    <ResponsiveImage
                      variant="fill"
                      aspectRatio="1 / 1"
                      src={image.url}
                      srcSet={image.srcSet}
                      alt={imageAlt(text, image)}
                      sizes="(max-width: 767px) 33vw, 160px"
                      unoptimized
                    />
                  </Mat>
                  <Label text={syntheticLabelText(text, image)} />
                </figure>
              ))}
            </div>
          )}
        </div>

        <div className={styles.details}>
          <header className={styles.header}>
            {product.category && <Eyebrow mark>{product.category.label}</Eyebrow>}
            <h1 className={styles.name}>{product.name}</h1>
            <p className={styles.meta}>
              {text.shared('label.reproduction')} · {text('product.sku', { sku: product.sku })}
            </p>
          </header>

          <VariantPicker
            productId={product.id}
            sku={product.sku}
            text={variantPickerText(text)}
            variants={variants}
            productPriceText={priceText}
            available={product.available}
            bagHref={bagHref}
          />

          <p className={styles.delivery}>{text('product.delivery')}</p>

          {product.relatedWork && (
            <p className={styles.original}>
              {text('product.original', { title: product.relatedWork.title })}{' '}
              <TextLink href={product.relatedWork.href} rel="noopener">
                {product.relatedWork.href.replace(/^https?:\/\/[^/]+/, '') || 'Indies Gallery'}
              </TextLink>
            </p>
          )}

          <ProofPoints
            items={[
              text('product.signalPaper'),
              text('product.signalWorkshop'),
            ]}
          />
        </div>
      </div>

      {product.description !== '' && (
        <section className={styles.story} aria-labelledby="product-story">
          <SectionHead id="product-story" title={text('product.description')} />
          <p className={styles.storyText}>{product.description}</p>
        </section>
      )}
    </article>
  )
}

/** A synthetic image's visible label, under the image; nothing for a photograph. */
function Label({ text }: { readonly text: string | null }): React.ReactElement | null {
  return text === null ? null : <figcaption className={styles.mockupNote}>{text}</figcaption>
}

/** The lowest price on offer: a variant's, when any is priced away from the product's own. */
function lowestOf(product: ProductVM): number {
  const prices = product.variants
    .map((variant) => variant.price ?? product.price)
    .filter((price): price is number => price !== null)
  return Math.min(...(product.price !== null ? [product.price, ...prices] : prices))
}
