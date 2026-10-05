/**
 * The simulator page (TASKS.md 6.5.a; COMMERCE.md §6): built only when simulate mode is on —
 * `notFound()` otherwise, and production refuses the simulator itself (`assertSimulatorAllowed`),
 * so this page can never be reached off a workstation, CI or staging. No attempt id in the URL
 * (`6.5-r2`): it takes the order's own latest `open` or `pending` attempt from the database, so a
 * guessable attempt id can never be settled by someone without the token.
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import {
  currentOpenAttemptId,
  currentOrderId,
  simulateModeEnabled,
} from '../../../../../../../server/shop/payment'
import { SimulateView } from '../../../../../../../sites/shop/payment/simulate-view'
import { siteHref } from '../../../../../../../shell/site'
import { siteLocale } from '../../../../../../../shell/messages'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function SimulatePage({
  params,
}: {
  readonly params: Promise<{ locale: string; token: string }>
}) {
  if (!simulateModeEnabled()) notFound()

  const { locale: rawLocale, token } = await params
  const locale = siteLocale('shop', rawLocale)
  if (locale === null) notFound()

  const orderId = await currentOrderId(token)
  if (orderId === null) notFound()

  const attempt = await currentOpenAttemptId(token)
  const orderHref = siteHref('shop')('order', { token }, locale)

  return <SimulateView token={token} locale={locale} attempt={attempt} orderHref={orderHref} />
}
