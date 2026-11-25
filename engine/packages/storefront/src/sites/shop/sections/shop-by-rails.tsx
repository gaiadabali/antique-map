/**
 * The shop's Wall Decor rail (TASKS.md 28.2; the owner's feedback of 2026-11-19): the products of
 * the categories marked Wall Decor as a rail of the shop's framed cards, each leading to its page,
 * and "See all" to the whole set — the home's (`WallDecorRail`). Since the UI/UX revision of
 * 2026-11-25 the shop page itself draws one view at a time beside its left panel
 * (`../browse/shop-panel`), so its own four rails are gone. The read is published-only and
 * projected (`server/shop/catalogue`), streamed inside `<Suspense>` so the build never touches a
 * database; with nothing to show — or a failed read — the rail is left out.
 */
import { Suspense, type ReactNode } from 'react'

import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import { listing } from '../../../server/shop/catalogue'
import { wallDecorCategoryIds } from '../../../server/shop/catalogue/shop-by'
import type { ListingVM } from '../../../server/shop/catalogue/view-models'
import { ProductCard } from '../browse/product-card'
import { homeText } from '../home/home-messages'
import { CapsLink } from '../ui/caps-link'
import { Rail } from '../ui/rail'
import { RailSkeleton } from '../ui/rail-skeleton'
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
