/**
 * The gallery's public read API's handlers (`./contract`, TASKS.md 23.5.a): the app that serves the
 * gallery mounts them under `/api/x/originals/` with its own reads — today's app until phase 25,
 * then the gallery app, which moves the mount and its reads, never copies them.
 *
 * In order, before anything reaches the database: the request is read (so `next build` never runs
 * a read, `atRequestTime`); a host that is not the gallery's is a plain 404, the same as an unknown
 * path (the shop's own host, the admin's, anything else); the per-address limit answers 429 with
 * `Retry-After` (SECURITY.md §2.10); a malformed stock number is a 404. Then the app's read, which
 * is published-only, projected and cached (`'use cache'`, the catalogue's tag) — this module only
 * shapes the answer: JSON, `nosniff`, a short shared cache life for the shop's server, no cookies.
 * A read that throws is a 503 the shop's client treats as no answer. Pure: no Payload, no Next.
 */
import type { RateLimiter } from '@engine/http/limits'
import { clientAddress, limited, limiters } from '@engine/http/limits'

import {
  isStockNumber,
  originalsLocaleOf,
  type FeaturedOriginal,
  type OriginalsLocale,
  type OriginalWork,
} from './contract'

/** What the serving app supplies: whose host this is, and its two reads. */
export type OriginalsReads = {
  /** The request's `Host` is one of the gallery's own (never `X-Forwarded-Host`). */
  readonly servesHost: (host: string | null) => boolean
  readonly byStockNumber: (
    stockNumber: string,
    locale: OriginalsLocale,
  ) => Promise<OriginalWork | null>
  readonly featured: (locale: OriginalsLocale) => Promise<readonly FeaturedOriginal[]>
  /** The per-address limiter; `limiters.originals` unless a test hands its own. */
  readonly limiter?: Pick<RateLimiter, 'hit'>
}

/** How long the shop's server (or anything between) may keep an answer, in seconds. */
export const ORIGINALS_MAX_AGE = 300
const NOT_FOUND_MAX_AGE = 60

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
} as const

function json(status: number, body: unknown, maxAge: number | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...HEADERS,
      'Cache-Control': maxAge === null ? 'no-store' : `public, max-age=${maxAge}`,
    },
  })
}

const offHost = () => json(404, { error: 'not-found' }, null)
const absent = () => json(404, { error: 'not-found' }, NOT_FOUND_MAX_AGE)
const unavailable = () => json(503, { error: 'unavailable' }, null)

/** The host and limit checks every answer passes first; a `Response` when one refuses. */
function gate(request: Request, reads: OriginalsReads): Response | null {
  const host = request.headers.get('host')
  if (!reads.servesHost(host)) return offHost()
  const wait = (reads.limiter ?? limiters.originals).hit(clientAddress(request.headers))
  return wait > 0 ? limited(wait) : null
}

const localeOf = (request: Request) =>
  originalsLocaleOf(new URL(request.url).searchParams.get('locale'))

export function originalsRoute(reads: OriginalsReads) {
  /** `GET /api/x/originals/{stockNumber}`. */
  async function byStockNumber(request: Request, stockNumber: string): Promise<Response> {
    const refused = gate(request, reads)
    if (refused) return refused
    if (!isStockNumber(stockNumber)) return absent()
    try {
      const work = await reads.byStockNumber(stockNumber, localeOf(request))
      return work === null ? absent() : json(200, { work }, ORIGINALS_MAX_AGE)
    } catch {
      return unavailable()
    }
  }

  /** `GET /api/x/originals/featured`. */
  async function featured(request: Request): Promise<Response> {
    const refused = gate(request, reads)
    if (refused) return refused
    try {
      const works = await reads.featured(localeOf(request))
      return json(200, { works }, ORIGINALS_MAX_AGE)
    } catch {
      return unavailable()
    }
  }

  return { byStockNumber, featured }
}
