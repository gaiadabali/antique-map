/** The bag page (6.2.b; EXPERIENCE-SHOP.md §5): the cookie bag, priced by the server. */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { readBag } from '../../../../../server/shop/bag'
import { BagView } from '../../../../../sites/shop/bag/bag-view'
import { currentSite } from '../../../../../shell/site'
import { siteLocale } from '../../../../../shell/messages'

/**
 * The route directory is `cart`, the internal route the shop's surface map names
 * (`SURFACE_ROUTES.cart`); the public addresses are `/bag` (en) and `/keranjang` (id), which the
 * proxy rewrites here — the bag is never reached at `/shop/cart`.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function BagPage({ params }: PageProps<'/shop/[locale]/cart'>) {
  const locale = siteLocale('shop', (await params).locale)
  if (locale === null) notFound()

  const [bag, site] = await Promise.all([readBag(), currentSite('shop')])
  void site
  return <BagView bag={bag} locale={locale} />
}
