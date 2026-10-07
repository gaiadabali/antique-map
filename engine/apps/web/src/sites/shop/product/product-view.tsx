/**
 * The product page (6.1.b; EXPERIENCE-SHOP.md §4), top to bottom on a phone: images, the title
 * block (name, Reproduction, SKU, price), the options as a radio group, stock and add to bag in
 * a sticky bar, the delivery line, the original it is made from (never with a price), then the
 * description. The words come from the lexicon; the prices are whole rupiah the server formats.
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import type { ProductVM } from '../../../server/shop/catalogue/view-models'
import { Breadcrumbs, ResponsiveImage, TextLink } from '../../../shared/ui'
import { ChatPageContext } from '../../../shared/chat/chat-page-context'
import { formatRupiah } from '../../../shared/ui/price/format-rupiah'
import { productText, variantPickerText } from './copy'
import styles from './product.module.css'
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

      <div className={styles.gallery}>
        {lead && (
          <ResponsiveImage
            variant="fill"
            aspectRatio="1 / 1"
            src={lead.url}
            alt={lead.alt}
            sizes="(max-width: 767px) 100vw, 50vw"
            priority
            className={styles.leadImage}
            unoptimized
          />
        )}
        {rest.length > 0 && (
          <div className={styles.thumbs}>
            {rest.map((image) => (
              <ResponsiveImage
                key={image.url}
                variant="fill"
                aspectRatio="1 / 1"
                src={image.url}
                alt={image.alt}
                sizes="(max-width: 767px) 33vw, 120px"
                className={styles.thumb}
                unoptimized
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.details}>
        <header className={styles.header}>
          <h1 className={styles.name}>{product.name}</h1>
          <p className={styles.reproduction}>{text.shared('label.reproduction')}</p>
          <p className={styles.sku}>{text('product.sku', { sku: product.sku })}</p>
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

        {product.description !== '' && (
          <section className={styles.description}>
            <h2 className={styles.sectionTitle}>{text('product.description')}</h2>
            <p>{product.description}</p>
          </section>
        )}
      </div>
    </article>
  )
}

/** The lowest price on offer: a variant's, when any is priced away from the product's own. */
function lowestOf(product: ProductVM): number {
  const prices = product.variants
    .map((variant) => variant.price ?? product.price)
    .filter((price): price is number => price !== null)
  return Math.min(...(product.price !== null ? [product.price, ...prices] : prices))
}
