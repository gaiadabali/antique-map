/**
 * `/track` with no token (TASKS.md 7.3.a; EXPERIENCE-SHOP.md §2 "Find my order"): an order number
 * and the email or WhatsApp number typed at checkout resend the tracking link by email, never
 * confirming whether an order exists.
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { siteLocale } from '../../../../../shell/messages'
import { FindOrder } from '../../../../../sites/shop/tracking/find-order-view'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function ShopTrackIndex({ params }: PageProps<'/shop/[locale]/track'>) {
  const locale = siteLocale('shop', (await params).locale)
  if (locale === null) notFound()

  return <FindOrder locale={locale} />
}
