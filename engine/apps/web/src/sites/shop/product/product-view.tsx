/**
 * The product page (6.1.b; EXPERIENCE-SHOP.md §4), in Outline Colour (17.6): it leads with the
 * shared `Crossing` — the copy (category, name, price, options, add to bag, delivery) on a field of
 * gamboge, the lead print lying across its edge, the thumbnails under it, the proof points after
 * the copy — then the story on the paper. The words come from the lexicon; the prices are whole
 * rupiah the server formats.
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import type { ProductVM } from '../../../server/shop/catalogue/view-models'
import {
  Crossing,
  Mat,
  MatNote,
  ProofPoints,
  ResponsiveImage,
  SectionHead,
  TextLink,
} from '../../../shared/ui'
import { windowRatio } from '../home/frame-ratio'
import { ChatPageContext } from '../../../shared/chat/chat-page-context'
import { formatRupiah } from '../../../shared/ui/price/format-rupiah'
import { productText, variantPickerText } from './copy'
import styles from './product.module.css'
import { imageAlt, syntheticLabelText } from './synthetic'
import { VariantPicker, type PickerVariant } from './variant-picker'

export function ProductView({
  product,
  locale,
  categoryHref,
}: {
  readonly product: ProductVM
  readonly locale: SiteLocale
  /** The shop-all address; the page draws no breadcrumb now (the category is a link in the copy). */
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
  const ratio = windowRatio(lead ?? null)
  return (
    <article className={styles.page}>
      <ChatPageContext title={product.name} />
      <Crossing
        lead
        pigment={1}
        fit="cover"
        ratio={ratio}
        aria-labelledby="product-title"
        copy={
          <div className={styles.copy}>
            {product.category &&
              (categoryHref ? (
                <a className={styles.category} href={categoryHref}>
                  {product.category.label}
                </a>
              ) : (
                <span className={styles.category}>{product.category.label}</span>
              ))}
            <h1 id="product-title" className={styles.name}>
              {product.name}
            </h1>
            <p className={styles.meta}>
              {text.shared('label.reproduction')} · {text('product.sku', { sku: product.sku })}
            </p>

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
          </div>
        }
        aside={
          <ProofPoints items={[text('product.signalPaper'), text('product.signalWorkshop')]} />
        }
        picture={
          lead ? (
            <ResponsiveImage
              variant="fill"
              aspectRatio={`${ratio} / 1`}
              src={lead.url}
              srcSet={lead.srcSet}
              alt={imageAlt(text, lead)}
              sizes="(max-width: 63.99rem) 100vw, 58vw"
              priority
              unoptimized
            />
          ) : (
            // No picture yet: the name stands in the window as type.
            <div className={styles.empty} style={{ aspectRatio: 1 }}>
              <MatNote>{product.name}</MatNote>
            </div>
          )
        }
        caption={
          lead && (syntheticLabelText(text, lead) !== null || rest.length > 0) ? (
            <>
              <Label text={syntheticLabelText(text, lead)} />
              {rest.length > 0 && (
                <ul className={styles.thumbs}>
                  {rest.map((image) => (
                    <li key={image.url} className={styles.thumb}>
                      <Mat size="compact">
                        <ResponsiveImage
                          variant="fill"
                          aspectRatio="1 / 1"
                          src={image.url}
                          srcSet={image.srcSet}
                          alt={imageAlt(text, image)}
                          sizes="(max-width: 47.99rem) 22vw, 120px"
                          unoptimized
                        />
                      </Mat>
                      <Label text={syntheticLabelText(text, image)} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : undefined
        }
      />

      {product.description !== '' && (
        <section className={styles.story} aria-labelledby="product-story">
          <SectionHead
            id="product-story"
            className={styles.storyHead}
            title={text('product.description')}
          />
          <p className={styles.storyText}>{product.description}</p>
        </section>
      )}
    </article>
  )
}

/** A synthetic image's visible label, under the image; nothing for a photograph. */
function Label({ text }: { readonly text: string | null }): React.ReactElement | null {
  return text === null ? null : <span className={styles.mockupNote}>{text}</span>
}

/** The lowest price on offer: a variant's, when any is priced away from the product's own. */
function lowestOf(product: ProductVM): number {
  const prices = product.variants
    .map((variant) => variant.price ?? product.price)
    .filter((price): price is number => price !== null)
  return Math.min(...(product.price !== null ? [product.price, ...prices] : prices))
}
