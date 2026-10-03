/** The product page (6.1.b): catalogue data with live availability, price and JSON-LD from here. */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { product as productOf } from '../../../../../../server/shop/catalogue'
import { jsonLdScript, pageMetadata, productJsonLd } from '../../../../../../server/seo'
import { productText } from '../../../../../../sites/shop/product/copy'
import { ProductView } from '../../../../../../sites/shop/product/product-view'
import { currentSite, siteHref } from '../../../../../../shell/site'
import { siteLocale } from '../../../../../../shell/messages'

export async function generateMetadata({
  params,
}: PageProps<'/shop/[locale]/product/[slug]'>): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const found = await productOf((await params).slug)
  if (found === null) return {}
  const text = productText(locale)
  const href = siteHref('shop')
  return pageMetadata({
    site: 'shop',
    locale,
    path: href('product', { slug: found.slug }, locale),
    title: found.name,
    description: text('product.meta'),
    ...(found.images[0] ? { image: { url: found.images[0].url, alt: found.images[0].alt } } : {}),
    origin: site.origin,
  })
}

export default async function ShopProduct({ params }: PageProps<'/shop/[locale]/product/[slug]'>) {
  const { locale: raw, slug } = await params
  const locale = siteLocale('shop', raw)
  if (locale === null) notFound()

  const found = await productOf(slug)
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
        shopHref={href('browse', {}, locale)}
        categoryHref={
          found.category === null ? null : href('collection', { slug: found.category.slug }, locale)
        }
      />
    </>
  )
}
