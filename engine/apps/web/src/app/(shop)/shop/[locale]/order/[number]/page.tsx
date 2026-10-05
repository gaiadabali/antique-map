/**
 * The order page (TASKS.md 6.5.a): `?t=` is the credential, never the number alone (SECURITY.md
 * T1–T2). `noindex`, no prefetch, `Referrer-Policy: no-referrer` so the token in the URL never
 * leaks to a link the page loads or to a search engine.
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { currentOrderView, snapConfig } from '../../../../../../server/shop/payment'
import { OrderView } from '../../../../../../sites/shop/payment/order-view'
import { siteHref } from '../../../../../../shell/site'
import { siteLocale } from '../../../../../../shell/messages'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  other: { 'Referrer-Policy': 'no-referrer' },
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ locale: string; number: string }>
  readonly searchParams: Promise<{ t?: string | string[] }>
}) {
  const [{ locale: rawLocale, number }, query] = await Promise.all([params, searchParams])
  const locale = siteLocale('shop', rawLocale)
  if (locale === null) notFound()
  const token = typeof query.t === 'string' ? query.t : undefined

  const order = await currentOrderView(number, token)
  if (order === null) notFound()

  const href = siteHref('shop')
  return (
    <OrderView
      order={order}
      token={token!}
      locale={locale}
      trackingHref={href('tracking', { token: token! }, locale)}
      snap={snapConfig()}
    />
  )
}
