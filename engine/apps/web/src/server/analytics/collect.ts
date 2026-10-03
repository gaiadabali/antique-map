/**
 * `POST /api/x/collect` — the beacon's writer (ANALYTICS.md §3, §6; TASKS.md 9.2.a). The checks
 * run in §6's order: origin, JSON body, batch size, user agent, rate — then every event against
 * the catalogue — and the survivors are stamped and inserted as one transaction. The answer is
 * always `204`, quickly, whatever was dropped; every drop is counted per reason (`dropped.ts`) so
 * a filter that eats real traffic shows. The address and user agent are used for the session hash,
 * bot filtering and `deviceClass`, then dropped: neither is stored (§2).
 */
import type { Payload } from 'payload'

import { isBotUserAgent } from './bots'
import { isKnownName, validateEvent, type IncomingEvent } from './catalogue'
import { countDropped } from './dropped'
import { deviceClass } from './device'
import { normalisePath, referrerHost, utmOf } from './path'
import { rateLimiter } from './rate'
import { sessionIdFor } from './session'
import { siteFromHost } from '@engine/config/sites'

/** A batch is at most 20 events and 8 KB (§3). */
export const MAX_EVENTS = 20
export const MAX_BODY_BYTES = 8192

export type CollectDeps = {
  /** Opened lazily: a refused request must not open a database connection. */
  getPayload: () => Promise<Payload>
  env?: Readonly<Record<string, string | undefined>>
  now?: () => Date
}

export type CollectInput = {
  method: string
  origin: string | null
  contentType: string | null
  userAgent: string | null
  address: string | null
  body: string | null
  referer: string | null
}

const EVENT_KEYS = ['name', 'at', 'locale', 'props', 'url', 'referrer', 'utm'] as const

function eventOf(value: unknown): IncomingEvent | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  const event: Record<string, unknown> = {}
  for (const key of EVENT_KEYS) event[key] = source[key]
  return event as unknown as IncomingEvent
}

/** The day an `at` falls on, in UTC+8 — Bali's WITA and Singapore time are the same offset. */
function dayOf(at: Date): string {
  return new Date(at.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function localeOf(value: unknown): 'en' | 'id' | undefined {
  return value === 'en' || value === 'id' ? value : undefined
}

function atOf(value: unknown, fallback: Date): Date {
  if (typeof value !== 'string' || value === '') return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

/**
 * The site an `Origin` header names — the only thing the origin check is for (§6 step 1): its
 * hostname must be on the allow-list (`siteFromHost`), which is where the `site` stamp comes from.
 * A missing or malformed origin, or a host on no list, is no site. `Host` is never trusted for
 * anything else here.
 */
function originSiteOf(
  origin: string | null,
  env: Readonly<Record<string, string | undefined>> | undefined,
): 'gallery' | 'shop' | null {
  if (origin === null) return null
  try {
    return siteFromHost(new URL(origin).hostname, env)?.site ?? null
  } catch {
    return null
  }
}

type Utm = { source: string | null; medium: string | null; campaign: string | null }

/** The envelope's landing utm wins; the page URL's params fill in whatever it leaves out. */
function mergeUtm(base: Utm, override: Utm): Utm {
  const merged: Utm = { ...base }
  for (const key of ['source', 'medium', 'campaign'] as const) {
    if (override[key] !== null) merged[key] = override[key]
  }
  return merged
}

/**
 * The whole collect pipeline. `204` whatever happens; what landed is what the caller's payload
 * now holds. Exported for the route and the tests — the route supplies the deps.
 */
export async function collect(input: CollectInput, deps: CollectDeps): Promise<Response> {
  const now = deps.now ?? (() => new Date())
  if (input.method !== 'POST') {
    countDropped('body')
    return answer()
  }
  const site = originSiteOf(input.origin, deps.env)
  if (site === null) {
    countDropped('origin')
    return answer()
  }

  if (input.contentType === null || !input.contentType.toLowerCase().includes('application/json')) {
    countDropped('body')
    return answer()
  }
  if (input.body === null || input.body.length > MAX_BODY_BYTES) {
    countDropped('batch-size')
    return answer()
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(input.body)
  } catch {
    countDropped('body')
    return answer()
  }
  const events = (parsed as { events?: unknown }).events
  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS) {
    countDropped('batch-size', events === undefined ? 1 : Array.isArray(events) ? events.length : 1)
    return answer()
  }

  if (isBotUserAgent(input.userAgent)) {
    countDropped('bot', events.length)
    return answer()
  }

  const address = input.address?.split(',')[0]?.trim() ?? null
  const userAgent = input.userAgent ?? ''
  const sessionId = sessionIdFor({ site, address, userAgent, env: deps.env, now: now() })
  if (!rateLimiter.allowAddress(address ?? 'no-address', now().getTime(), events.length)) {
    countDropped('rate-address', events.length)
    return answer()
  }
  if (!rateLimiter.allowSession(sessionId, now().getTime(), events.length)) {
    countDropped('rate-session', events.length)
    return answer()
  }

  const stamped: Array<Record<string, unknown>> = []
  for (const raw of events) {
    const event = eventOf(raw)
    if (event === null) {
      countDropped('props')
      continue
    }
    const valid = validateEvent(event, site)
    if (valid === null) {
      countDropped(isKnownName(event.name) ? 'props' : 'unknown-name')
      continue
    }
    const at = atOf(event.at, now())
    const url = typeof event.url === 'string' ? event.url : null
    stamped.push({
      site,
      name: valid.name,
      at: at.toISOString(),
      day: dayOf(at),
      source: 'beacon',
      sessionId,
      path: normalisePath(url),
      locale: localeOf(event.locale),
      deviceClass: deviceClass(userAgent),
      referrerHost:
        referrerHost(typeof event.referrer === 'string' ? event.referrer : null) ??
        referrerHost(input.referer),
      // The envelope's landing utm wins; the page URL's params fill in whatever it leaves out.
      utm: mergeUtm(
        utmOf(url),
        utmOf(event.utm as string | Record<string, unknown> | null | undefined),
      ),
      props: valid.props,
    })
  }
  if (stamped.length === 0) return answer()

  try {
    const payload = await deps.getPayload()
    // One transaction for the whole batch (§7): the adapter's id joins every Local API call to
    // it through `req.transactionID`; `null` when transactions are unavailable, which still
    // inserts — just row by row.
    const tx = (await payload.db.beginTransaction()) ?? null
    try {
      for (const data of stamped) {
        await payload.create({
          collection: 'events',
          data,
          overrideAccess: true,
          ...(tx === null ? {} : { req: { transactionID: tx } }),
        })
      }
      if (tx !== null) await payload.db.commitTransaction(tx)
    } catch (error) {
      if (tx !== null) await payload.db.rollbackTransaction(tx)
      throw error
    }
  } catch {
    countDropped('insert', stamped.length)
  }
  return answer()
}

/** `204`, uncached — the only answer collect ever gives. */
function answer(): Response {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}
