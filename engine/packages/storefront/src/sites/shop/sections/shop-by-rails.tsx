/**
 * The shop page's "Shop by" (TASKS.md 28.2; the owner's feedback of 2026-11-19): best sellers,
 * then themes, then product types, then wall decor — each a rail of the shop's framed cards that
 * leads on: a product to its page, a theme to the shop narrowed to it, a product type to its
 * category, and each rail's "See all" to the whole set. Every read is published-only and projected
 * (`server/shop/catalogue`), streamed inside `<Suspense>` so the build never touches a database; a
 * rail with nothing to show — or whose read fails — is left out. The Wall Decor rail is the home's
 * too (`WallDecorRail`).
 */
import { Suspense, type ReactNode } from 'react'

import { createHref, SITES, type SiteLocale } from '@engine/config/sites'
import { ResponsiveImage, printAspectOf, printRatioOf } from '@engine/ui'

import { listing } from '../../../server/shop/catalogue'
import { collections } from '../../../server/shop/catalogue/collections'
import { themes, wallDecorCategoryIds } from '../../../server/shop/catalogue/shop-by'
import type { CatalogueImage, ListingVM } from '../../../server/shop/catalogue/view-models'
import { ProductCard } from '../browse/product-card'
import { collectionsText } from '../collections/copy'
import { homeText } from '../home/home-messages'
import { productText } from '../product/copy'
import { imageAlt } from '../product/synthetic'
import { CapsLink } from '../ui/caps-link'
import { Rail } from '../ui/rail'
import { RailSkeleton } from '../ui/rail-skeleton'
import { ShopCard } from '../ui/shop-card'
import { sectionsText } from './copy'
import { shopFilterHref } from './links'

type Locale = { readonly locale: SiteLocale }

/** How many cards a rail shows before its "See all". */
const RAIL_SIZE = 12

async function safely<T>(read: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await read()
  } catch {
    return empty
  }
}

function Streamed({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <Suspense fallback={<RailSkeleton title={title} />}>{children}</Suspense>
}

function railProps(id: string, title: string, locale: SiteLocale) {
  const t = homeText(locale)
  return {
    id,
    title,
    previousLabel: t('home.shop.railPrevious'),
    nextLabel: t('home.shop.railNext'),
  }
}

function SeeAll({ href, name, locale }: { href: string; name: string } & Locale) {
  const t = sectionsText(locale)
  return (
    <CapsLink href={href} aria-label={t('shopBy.seeAllOf', { name })}>
      {t('shopBy.seeAll')}
    </CapsLink>
  )
}

function Picture({ image, locale }: { image: CatalogueImage | null } & Locale) {
  if (image === null) return null
  return (
    <ResponsiveImage
      variant="fill"
      aspectRatio={printAspectOf(printRatioOf(image))}
      src={image.url}
      srcSet={image.srcSet}
      alt={imageAlt(productText(locale), image)}
      sizes="(max-width: 56.25rem) 45vw, 24vw"
      unoptimized
    />
  )
}

/** A rail of products from one listing read, with "See all" when there are more. */
function ProductsRail({
  id,
  title,
  list,
  allHref,
  locale,
}: { id: string; title: string; list: ListingVM; allHref: string } & Locale) {
  if (list.items.length === 0) return null
  const href = createHref(SITES.shop)
  return (
    <Rail
      {...railProps(id, title, locale)}
      more={<SeeAll href={allHref} name={title} locale={locale} />}
    >
      {list.items.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          locale={locale}
          href={href('product', { slug: product.slug }, locale)}
        />
      ))}
    </Rail>
  )
}

async function BestSellers({ locale }: Locale) {
  const title = sectionsText(locale)('shopBy.bestSellers')
  const list = await safely(() => listing({ bestSeller: true, pageSize: RAIL_SIZE }), null)
  if (list === null) return null
  const allHref = shopFilterHref({ kind: 'set', set: 'best-sellers' }, locale)
  return <ProductsRail id="shop-best-sellers" title={title} list={list} {...{ allHref, locale }} />
}

async function Themes({ locale }: Locale) {
  const title = sectionsText(locale)('shopBy.themes')
  const list = await safely(() => themes(locale), [])
  if (list.length === 0) return null
  return (
    <Rail {...railProps('shop-themes', title, locale)}>
      {list.map((theme) => (
        <ShopCard
          key={theme.slug}
          href={shopFilterHref({ kind: 'theme', slug: theme.slug }, locale)}
          ratio={printRatioOf(theme.image)}
          title={theme.label}
          picture={<Picture image={theme.image} locale={locale} />}
        />
      ))}
    </Rail>
  )
}

async function ProductTypes({ locale }: Locale) {
  const title = sectionsText(locale)('shopBy.productTypes')
  const list = await safely(() => collections(), [])
  if (list.length === 0) return null
  const text = collectionsText(locale)
  const href = createHref(SITES.shop)
  return (
    <Rail
      {...railProps('shop-product-types', title, locale)}
      more={<SeeAll href={href('collection', {}, locale)} name={title} locale={locale} />}
    >
      {list.map((type) => (
        <ShopCard
          key={type.slug}
          href={href('collection', { slug: type.slug }, locale)}
          ratio={printRatioOf(type.image)}
          title={type.label}
          aside={text('collections.count', { count: type.count })}
          picture={<Picture image={type.image} locale={locale} />}
        />
      ))}
    </Rail>
  )
}

/** The products of the categories marked Wall Decor: the shop page's last rail, and the home's. */
export async function WallDecorProducts({ locale, id }: Locale & { readonly id: string }) {
  const title = sectionsText(locale)('shopBy.wallDecor')
  const ids = await safely(() => wallDecorCategoryIds(), [])
  if (ids.length === 0) return null
  const list = await safely(() => listing({ categoryIds: ids, pageSize: RAIL_SIZE }), null)
  if (list === null) return null
  const allHref = shopFilterHref({ kind: 'set', set: 'wall-decor' }, locale)
  return <ProductsRail id={id} title={title} list={list} {...{ allHref, locale }} />
}

export function WallDecorRail({ locale, id }: Locale & { readonly id: string }) {
  return (
    <Streamed title={sectionsText(locale)('shopBy.wallDecor')}>
      <WallDecorProducts locale={locale} id={id} />
    </Streamed>
  )
}

/** The four rails in the owner's order. */
export function ShopByRails({ locale }: Locale) {
  const t = sectionsText(locale)
  return (
    <>
      <Streamed title={t('shopBy.bestSellers')}>
        <BestSellers locale={locale} />
      </Streamed>
      <Streamed title={t('shopBy.themes')}>
        <Themes locale={locale} />
      </Streamed>
      <Streamed title={t('shopBy.productTypes')}>
        <ProductTypes locale={locale} />
      </Streamed>
      <WallDecorRail locale={locale} id="shop-wall-decor" />
    </>
  )
}
