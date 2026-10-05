/**
 * The simulator page (TASKS.md 6.5.a; COMMERCE.md §6): built only when simulate mode is on —
 * `notFound()` otherwise, and production refuses the simulator itself (`assertSimulatorAllowed`),
 * so this page can never be reached off a workstation, CI or staging.
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { currentOrderId, simulateModeEnabled } from '../../../../../../../server/shop/payment'
import { SimulateView } from '../../../../../../../sites/shop/payment/simulate-view'
import { siteLocale } from '../../../../../../../shell/messages'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  other: { 'Referrer-Policy': 'no-referrer' },
}

export default async function SimulatePage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ locale: string; number: string }>
  readonly searchParams: Promise<{ t?: string | string[]; attempt?: string | string[] }>
}) {
  if (!simulateModeEnabled()) notFound()

  const [{ locale: rawLocale, number }, query] = await Promise.all([params, searchParams])
  const locale = siteLocale('shop', rawLocale)
  if (locale === null) notFound()
  const token = typeof query.t === 'string' ? query.t : undefined
  const attempt = typeof query.attempt === 'string' ? query.attempt : undefined
  if (!attempt) notFound()

  const orderId = await currentOrderId(number, token)
  if (orderId === null) notFound()

  return <SimulateView number={Number(number)} token={token!} locale={locale} attempt={attempt} />
}
