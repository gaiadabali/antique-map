/** The product page (6.1.b): catalogue data with live availability, price and JSON-LD from here. */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { product as productOf, productEditorial } from '../server/shop/catalogue'
import { jsonLdScript, pageMetadata, productJsonLd, trimDescription } from '@engine/site/seo'
import { loadSiteSettings } from '@engine/site/site-settings'
import { productText } from '../sites/shop/product/copy'
import { productPageCopy } from '../sites/shop/product/page-copy'
import { ProductView } from '../sites/shop/product/product-view'
import { PromoBanner } from '../sites/shop/sections/promo'
import { currentSite, siteHref } from '../shell/site'
import { siteLocale } from '../shell/messages'
import type { SlugProps } from './props'
import type { ProductVM } from '../server/shop/catalogue/view-models'
import type { SiteLocale } from '@engine/config/sites'
import type { ReactNode } from 'react'

/**
 * The shop app's "See the original" (TASKS.md 23.5): the link to the antique the product is made
 * from, by its stock number; absent, the page draws nothing in its place.
 */
export type OriginalSlot = (product: ProductVM, locale: SiteLocale) => ReactNode

export async function generateMetadata({ params }: SlugProps): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  // Metadata needs no availability: the cached editorial read, never a live stock query.
  const found = await productEditorial((await params).slug, locale)
  if (found === null) return {}
  const text = productText(locale)
  const href = siteHref('shop')
  return pageMetadata({
    site: 'shop',
    locale,
    paths: {
      en: href('product', { slug: found.slug }, 'en'),
      id: href('product', { slug: found.slug }, 'id'),
    },
    title: found.name,
    description:
      found.description.trim() !== '' ? trimDescription(found.description) : text('product.meta'),
    ...(found.images[0] ? { image: { url: found.images[0].url, alt: found.images[0].alt } } : {}),
    origin: site.origin,
  })
}

export default async function ShopProduct({
  params,
  original,
}: SlugProps & { readonly original?: OriginalSlot }) {
  const { locale: raw, slug } = await params
  const locale = siteLocale('shop', raw)
  if (locale === null) notFound()

  // The product (live availability, never cached) and the owner's fixed words (cached settings).
  const [found, settings] = await Promise.all([
    productOf(slug, locale),
    loadSiteSettings('shop', locale),
  ])
  if (found === null) notFound()

  const href = siteHref('shop')
  // The product JSON-LD carries one integer rupiah price and its availability, nothing more.
  const price = found.variants[0]?.price ?? found.price
  const jsonLd =
    price !== null
      ? jsonLdScript(
          productJsonLd({
            sku: found.sku,
            name: found.name,
            image: found.images[0]?.url ?? null,
            priceRupiah: price,
            inStock: found.available,
            url: href('product', { slug: found.slug }, locale),
          }),
        )
      : null

  return (
    <>
      {jsonLd !== null && <div dangerouslySetInnerHTML={{ __html: jsonLd }} />}
      <ProductView
        product={found}
        locale={locale}
        pageCopy={productPageCopy(productText(locale), settings.productPage, settings.freeOverIdr)}
        shopHref={href('browse', {}, locale)}
        original={original?.(found, locale) ?? null}
        banner={<PromoBanner locale={locale} />}
        categoryHref={
          found.category === null ? null : href('collection', { slug: found.category.slug }, locale)
        }
      />
    </>
  )
}
