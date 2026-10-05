'use server'

/**
 * The order page's server actions (TASKS.md 6.5.a; COMMERCE.md §6, §13; EXPERIENCE-SHOP.md §7–§8).
 * Every action re-checks the tracking token itself — the page passes it as a hidden field, never
 * as a client-trusted "this is order 104" — and `openPaymentAttempt` is the only thing that ever
 * opens or reopens a payment: nothing here marks an order paid.
 */
import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { siteOrigin } from '@engine/config/sites'
import { cms } from '@engine/cms/instance'
import { siteHref } from '../../../shell/site'
import {
  createPaymentProvider,
  openPaymentAttempt,
  paymentsConfigFromEnv,
  simulatorProvider,
  SIMULATOR_ACTIONS,
  type SimulatorAction,
} from '@engine/cms/shop/payments'
import {
  BAG_COOKIE_ATTRIBUTES,
  BAG_COOKIE_NAME,
  bagCookieKeyFromEnv,
  serialiseBag,
} from '@engine/cms/shop/pricing'

import { loadOrderLinesForBag, orderIdForBuyer } from './load-order'

const secure = process.env.NODE_ENV === 'production'

function orderPath(locale: string, number: string, token: string): string {
  return `/${locale}/order/${number}?t=${encodeURIComponent(token)}`
}

function orderUrl(locale: string, number: string, token: string): string {
  return `${siteOrigin('shop') ?? ''}${orderPath(locale, number, token)}`
}

function fields(formData: FormData) {
  return {
    number: String(formData.get('number') ?? ''),
    token: String(formData.get('token') ?? ''),
    locale: formData.get('locale') === 'id' ? ('id' as const) : ('en' as const),
  }
}

export type PayState =
  | { readonly ok: true; readonly mode: 'snap'; readonly token: string; readonly clientKey: string }
  | { readonly ok: false; readonly reason: 'not-found' | 'not-payable' | 'window-closed' | 'server-error' }
  | null

/**
 * *Pay* and *Try again* (EXPERIENCE-SHOP.md §6, §8): opens or reopens the order's payment. Simulate
 * mode redirects straight to the simulator page; Snap mode answers the token and client key for
 * the page's pop-up, which falls back to `redirectUrl` (`SnapPay`).
 */
export async function payAction(_prev: PayState, formData: FormData): Promise<PayState> {
  const { number, token, locale } = fields(formData)
  if (!number || !token) return { ok: false, reason: 'not-found' }

  const payload = await cms()
  const orderId = await orderIdForBuyer(payload, number, token)
  if (orderId === null) return { ok: false, reason: 'not-found' }

  const configured = paymentsConfigFromEnv()
  if (!configured.ok) return { ok: false, reason: 'server-error' }
  const { config } = configured

  const provider =
    config.mode === 'simulate'
      ? simulatorProvider(
          config,
          (id) => `/${locale}/order/${number}/simulate?attempt=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`,
        )
      : createPaymentProvider(config)

  let opened
  try {
    opened = await openPaymentAttempt(payload, provider, {
      orderId,
      finishUrl: orderUrl(locale, number, token),
    })
  } catch {
    return { ok: false, reason: 'server-error' }
  }
  if (!opened.ok) return { ok: false, reason: opened.reason }

  if (config.mode === 'simulate') redirect(opened.redirectUrl)
  if (config.clientKey === null) return { ok: false, reason: 'server-error' }
  return { ok: true, mode: 'snap', token: opened.token, clientKey: config.clientKey }
}

/**
 * "Put these back in my bag" (§8): rebuilds the `cart` cookie from the order's lines (product,
 * variant, quantity only — never a price) and sends the buyer to the bag, which re-prices
 * everything from the database. Never changes the order. A plain form action (no client state):
 * a wrong token simply sends the buyer to the empty bag, same as any stale cookie would.
 */
export async function putBackInBagAction(formData: FormData): Promise<void> {
  const { number, token, locale } = fields(formData)
  const payload = await cms()
  const lines = await loadOrderLinesForBag(payload, number, token)

  if (lines !== null) {
    const key = bagCookieKeyFromEnv()
    const jar = await cookies()
    jar.set(BAG_COOKIE_NAME, serialiseBag(lines, key), { ...BAG_COOKIE_ATTRIBUTES, secure })
  }
  redirect(siteHref('shop')('cart', {}, locale))
}

/**
 * The simulator's four buttons (COMMERCE.md §6): signs the notification `action` would send and
 * posts it to the real webhook route — the same function the app mounts at
 * `/api/x/webhooks/midtrans` — so the verify → confirm → apply path runs end to end. Never
 * reachable off simulate mode (`assertSimulatorAllowed`, inside `simulatorProvider`).
 */
export async function simulateAction(formData: FormData): Promise<void> {
  const { number, token, locale } = fields(formData)
  const attempt = String(formData.get('attempt') ?? '')
  const action = String(formData.get('action') ?? '')
  if (!SIMULATOR_ACTIONS.includes(action as SimulatorAction) || !attempt) {
    redirect(orderPath(locale, number, token))
  }

  const configured = paymentsConfigFromEnv()
  if (configured.ok && configured.config.mode === 'simulate') {
    const provider = simulatorProvider(configured.config)
    const notification = provider.emit(attempt, action as SimulatorAction)
    const { POST: midtransWebhook } = await import('@engine/http/webhooks/midtrans')
    await midtransWebhook(
      new Request('http://localhost/api/x/webhooks/midtrans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: notification.body,
      }),
    )
  }
  redirect(orderPath(locale, number, token))
}
