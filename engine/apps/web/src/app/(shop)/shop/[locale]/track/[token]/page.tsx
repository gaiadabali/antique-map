/**
 * The tracking page (TASKS.md 7.3.a; COMMERCE.md §10): the token in the path is the order's whole
 * credential — `loadTracking` is itself the access decision, this file only turns `null` into the
 * same 404 a malformed route gets. `noindex`, `no-store` and `Referrer-Policy: no-referrer` come
 * from the proxy for every `sensitive` surface (`@engine/config/sites`'s `tracking` surface); the
 * static `robots` metadata below is a second line of defence for anything that reaches Next without
 * the proxy in front, the same belt-and-braces the cart and checkout pages already keep.
 *
 * **Known gap, reported** (`../../../../../../sites/shop/tracking/rate-limit.ts`'s own header): a
 * throttled guess should answer 429; only the proxy can set that on a page request, so until that
 * wiring lands a throttled guess gets the same 404 a wrong token gets here.
 */
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { loadSiteSettings } from '../../../../../../server/site-settings'
import { clientAddress } from '../../../../../../server/chat/identity'
import { siteLocale } from '../../../../../../shell/messages'
import { loadTracking } from '../../../../../../sites/shop/tracking/load-tracking'
import { trackGuessAllowed } from '../../../../../../sites/shop/tracking/rate-limit'
import { TrackingPage } from '../../../../../../sites/shop/tracking/tracking-view'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function ShopTrackToken({
  params,
}: PageProps<'/shop/[locale]/track/[token]'>) {
  const { locale: rawLocale, token } = await params
  const locale = siteLocale('shop', rawLocale)
  if (locale === null) notFound()

  const address = clientAddress(await headers())
  if (trackGuessAllowed(address ?? 'unknown') > 0) notFound()

  const view = await loadTracking(token)
  if (view === null) notFound()

  const settings = await loadSiteSettings('shop', locale)
  return <TrackingPage view={view} locale={locale} shopWhatsapp={settings.contact.whatsapp} />
}
