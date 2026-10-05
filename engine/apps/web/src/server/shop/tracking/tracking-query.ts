/**
 * The tracking page's query (COMMERCE.md §10; SECURITY.md §2.5 T1–T3; TASKS.md 7.3.a): a token
 * alone is the order's whole credential (`@engine/config/sites`'s `tracking` surface, `/track/
 * {token}`, no order number in the address) — wrong or missing both answer `null`, which the page
 * turns into the same 404.
 *
 * The token is looked up by its SHA-256 (`trackingTokenHash` from `@engine/cms/shop/orders`, the
 * same hash `createOrder` stores), as a database equality match: there is no app-level compare to
 * time, because a wrong guess never reaches a candidate row to compare against — the index finds
 * none. `overrideAccess: true` is deliberate (SECURITY.md §2.2): this loader is itself the access
 * control, projecting only what the buyer may see (`select` below) from fields that are otherwise
 * `SERVER_ONLY` or `NEVER_EXPOSED`.
 *
 * Never shown (COMMERCE.md §10): the delivery pin, store stock, staff names or notes, the Snap
 * token, the tracking token's hash. The buyer's own phone and email are masked even though it is
 * their own order, so a forwarded link shows less.
 *
 * No `'server-only'` here, unlike `./load-tracking`'s thin wrapper (the catalogue's own
 * `queries.ts`/`catalogue.ts` split, `server/shop/catalogue`): `loadTrackingWith` takes its
 * `Payload` explicitly so a database test can hand it the pushed test stack's instance.
 */
import type { Payload } from 'payload'

import { driverImageUrl, DRIVER_IMAGE_URL_MAX_TTL } from '@engine/cms/shop/fulfilment'
import { trackingTokenHash } from '@engine/cms/shop/orders'

/** The line an order moves along once paid (COMMERCE.md §7); `cancelled`/`expired` are terminal. */
export const TRACKING_STEPS = [
  'paid',
  'processing',
  'waiting_driver',
  'on_the_way',
  'delivered',
] as const
export type TrackingStepKey = (typeof TRACKING_STEPS)[number]

export type TrackingStep = { readonly key: TrackingStepKey; readonly at: string | null }

export type TrackingView = {
  readonly orderNumber: number
  readonly locale: 'en' | 'id'
  readonly status: TrackingStepKey | 'pending_payment' | 'cancelled' | 'expired'
  readonly steps: readonly TrackingStep[]
  readonly items: readonly { readonly name: string; readonly qty: number }[]
  readonly totals: {
    readonly subtotal: number
    readonly discount: number
    readonly deliveryFee: number
    readonly total: number
  }
  readonly deliveryAddress: string
  readonly store: { readonly name: string; readonly area: string | null }
  readonly driverImageUrl: string | null
  readonly contact: { readonly nameMasked: string; readonly emailMasked: string }
}

type OrderRow = {
  readonly id: number
  readonly number: number
  readonly status: string
  readonly history?: readonly { to?: unknown; at?: unknown }[] | null
  readonly contact?: {
    name?: string | null
    email?: string | null
    locale?: string | null
  } | null
  readonly delivery?: { address?: string | null } | null
  readonly store?: { name?: string | null; area?: string | null } | number | null
  readonly lines?: readonly { name?: string | null; qty?: number | null }[] | null
  readonly totals?: {
    subtotal?: number | null
    discount?: number | null
    deliveryFee?: number | null
    total?: number | null
  } | null
}

function maskName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) return ''
  const first = trimmed.split(/\s+/)[0] ?? trimmed
  return first.length <= 1 ? `${first}…` : `${first[0]}${'*'.repeat(first.length - 1)}`
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!user || !domain) return '•••'
  const shown = user.slice(0, 1)
  return `${shown}${'*'.repeat(Math.max(user.length - 1, 1))}@${domain}`
}

function isTrackingStatus(value: string): value is TrackingView['status'] {
  return (
    (TRACKING_STEPS as readonly string[]).includes(value) ||
    value === 'pending_payment' ||
    value === 'cancelled' ||
    value === 'expired'
  )
}

/** `loadTrackingWith(payload, token)` → a projected view, or `null` for a wrong or missing token. */
export async function loadTrackingWith(
  payload: Payload,
  token: string,
): Promise<TrackingView | null> {
  if (token.length === 0 || token.length > 200) return null

  const hash = trackingTokenHash(token)
  let order: OrderRow | undefined
  try {
    const result = await payload.find({
      collection: 'orders',
      overrideAccess: true,
      limit: 1,
      where: { trackingTokenHash: { equals: hash } },
      depth: 1,
      select: {
        number: true,
        status: true,
        history: { to: true, at: true },
        contact: { name: true, email: true, locale: true },
        delivery: { address: true },
        store: { name: true, area: true },
        lines: { name: true, qty: true },
        totals: { subtotal: true, discount: true, deliveryFee: true, total: true },
      },
    })
    order = result.docs[0] as OrderRow | undefined
  } catch {
    return null
  }
  if (!order || !isTrackingStatus(order.status)) return null

  const history = order.history ?? []
  const steps: TrackingStep[] = TRACKING_STEPS.map((key) => {
    const entry = history.find((row) => row.to === key)
    const at = typeof entry?.at === 'string' ? entry.at : null
    return { key, at }
  })

  const driverUrl =
    order.status === 'on_the_way' || order.status === 'delivered'
      ? await driverImageUrl(payload, order.id, DRIVER_IMAGE_URL_MAX_TTL).catch(() => null)
      : null

  const store = typeof order.store === 'object' && order.store !== null ? order.store : null

  return {
    orderNumber: order.number,
    locale: order.contact?.locale === 'id' ? 'id' : 'en',
    status: order.status,
    steps,
    items: (order.lines ?? []).map((line) => ({
      name: line.name ?? '',
      qty: line.qty ?? 1,
    })),
    totals: {
      subtotal: order.totals?.subtotal ?? 0,
      discount: order.totals?.discount ?? 0,
      deliveryFee: order.totals?.deliveryFee ?? 0,
      total: order.totals?.total ?? 0,
    },
    deliveryAddress: order.delivery?.address ?? '',
    store: { name: store?.name ?? '', area: store?.area ?? null },
    driverImageUrl: driverUrl,
    contact: {
      nameMasked: maskName(order.contact?.name ?? ''),
      emailMasked: maskEmail(order.contact?.email ?? ''),
    },
  }
}
