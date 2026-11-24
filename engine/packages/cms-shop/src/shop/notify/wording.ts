/**
 * Each email's subject and opening as the owner words them (TASKS.md 27.1.b, 27.3.d; the plan's
 * K4): `site-settings.shop.emails.<key>.{subject,opening}`, per locale. A field read empty — never
 * set, cleared, or a database from before these fields — sends the default, which is the
 * notifier's own wording (`ORDER_EMAILS`), so nothing an owner leaves alone changes.
 *
 * `{number}` is replaced by the order number and `{store}` by the store's name; nothing else in
 * the owner's text is interpreted. The text is the owner's own, and still only text: the
 * templates escape it for the HTML part (`./render`). What follows the opening — lines, totals and
 * links — is the notifier's alone, so no wording can break a figure or a link.
 */
import type { Payload, PayloadRequest } from 'payload'

import { ORDER_EMAILS, type OrderEmail } from '../../globals/site-settings/shop/notification-copy'
import type { OrderStatus } from '../../collections/orders/statuses'

export type Lang = 'en' | 'id'

/** One email's subject and opening, placeholders already filled. */
export type Wording = { readonly subject: string; readonly opening: string }

export type WordingVars = { readonly number: number; readonly store?: string | null }

/** The buyer's status email for each status that has one (`pending_payment` has two: see `./index`). */
export const STATUS_EMAIL: Partial<Record<OrderStatus, OrderEmail>> = {
  awaiting_quote: 'awaitingQuote',
  paid: 'paid',
  processing: 'processing',
  waiting_driver: 'waitingDriver',
  on_the_way: 'onTheWay',
  delivered: 'delivered',
  cancelled: 'cancelled',
  expired: 'expired',
}

type Stored = Partial<Record<OrderEmail, { subject?: unknown; opening?: unknown } | null>>

/** What the owner wrote for `locale`, by email; `{}` when the read fails (the defaults apply). */
export type StoredWording = Stored

const LIMIT = { subject: 150, opening: 600 } as const

/** `{number}` and `{store}` filled in; every other character kept as the owner wrote it. */
export function fill(text: string, vars: WordingVars): string {
  return text.replaceAll('{number}', String(vars.number)).replaceAll('{store}', vars.store ?? '')
}

const textOr = (value: unknown, fallback: string, max: number): string => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed === '' ? fallback : trimmed.slice(0, max)
}

/** `key`'s wording in `locale`: the owner's where set, the default where not, filled. */
export function wordingFor(
  stored: StoredWording,
  key: OrderEmail,
  locale: Lang,
  vars: WordingVars,
): Wording {
  const own = stored[key] ?? null
  const fallback = ORDER_EMAILS[key]
  return {
    subject: fill(textOr(own?.subject, fallback.subject[locale], LIMIT.subject), vars),
    opening: fill(textOr(own?.opening, fallback.opening[locale], LIMIT.opening), vars),
  }
}

/**
 * The owner's email wording in `locale`, read fresh (staff data: access overridden, the `emails`
 * group only, no fallback locale so an empty Indonesian field means the Indonesian default, not the
 * English text). Never throws: a failed read sends the defaults.
 */
export async function loadStoredWording(
  payload: Payload,
  locale: Lang,
  req?: PayloadRequest,
): Promise<StoredWording> {
  try {
    const settings = await payload.findGlobal({
      slug: 'site-settings',
      select: { shop: { emails: true } } as never,
      locale,
      fallbackLocale: false,
      depth: 0,
      overrideAccess: true,
      ...(req ? { req } : {}),
    })
    const shop = (settings as { shop?: { emails?: Stored | null } | null }).shop
    return shop?.emails ?? {}
  } catch {
    return {}
  }
}
