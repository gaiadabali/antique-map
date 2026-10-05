/**
 * The checkout route (6.3.a): the review and the form, priced and computed on the server. An empty
 * or missing bag goes back to the bag. Nothing here is cached — the checkout decides a purchase —
 * and no key reaches the client but the referrer-restricted browser Maps key, read from the
 * environment on the server and passed as a prop.
 */
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { readCheckout } from '../../../../../server/shop/checkout'
import { CheckoutView } from '../../../../../sites/shop/checkout/checkout-view'
import { createHref, SITES } from '@engine/config/sites'
import { currentSite } from '../../../../../shell/site'
import { siteLocale } from '../../../../../shell/messages'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function CheckoutPage({ params }: PageProps<'/shop/[locale]/checkout'>) {
  const locale = siteLocale('shop', (await params).locale)
  if (locale === null) notFound()

  const [read, site] = await Promise.all([readCheckout(), currentSite('shop')])
  void site
  if (read.lines.length === 0) {
    // An empty or missing bag is not a checkout; the bag explains itself.
    redirect(createHref(SITES.shop)('cart', {}, locale))
  }

  return (
    <CheckoutView
      read={read}
      locale={locale}
      // `||`, not `??`: a host's .env carries the key blank until the owner supplies one (staging),
      // and a blank key must mean "no key" — the typed-pin fallback — not Google Maps without one.
      browserKey={process.env.GOOGLE_MAPS_BROWSER_KEY || null}
    />
  )
}
