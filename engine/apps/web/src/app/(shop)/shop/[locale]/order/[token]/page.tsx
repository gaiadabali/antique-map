/**
 * The order page (TASKS.md 6.5.a): the token is the whole credential, the only thing the URL
 * carries (`6.5-r2`'s routing decision — no number, no `?t=`). `noindex`; the proxy sets
 * `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex` itself for this sensitive surface, so
 * the token in the URL never leaks to a link the page loads or to a search engine.
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { currentOrderView, snapConfig } from '../../../../../../server/shop/payment'
import { OrderView } from '../../../../../../sites/shop/payment/order-view'
import { siteHref } from '../../../../../../shell/site'
import { siteLocale } from '../../../../../../shell/messages'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function OrderPage({
  params,
}: {
  readonly params: Promise<{ locale: string; token: string }>
}) {
  const { locale: rawLocale, token } = await params
  const locale = siteLocale('shop', rawLocale)
  if (locale === null) notFound()

  const order = await currentOrderView(token)
  if (order === null) notFound()

  const href = siteHref('shop')
  return (
    <OrderView
      order={order}
      token={token}
      locale={locale}
      orderHref={href('order', { token }, locale)}
      trackingHref={href('tracking', { token }, locale)}
      snap={snapConfig()}
    />
  )
}
