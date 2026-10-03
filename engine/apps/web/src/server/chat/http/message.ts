/**
 * `POST /api/x/chat/message` — one visitor turn, streamed (AI.md §2.2). Body
 * `{ text, locale, pagePath }`; the session comes from its cookie. Checks, in order, before any
 * model call: the site and origin, the session, the rate limits (60 per hour per address, one per
 * 2 s and one at a time per session), the input (1,000 characters; longer is `too_long`, never
 * truncated), then the turn's gate — kill switch, message cap, re-challenge, token cap, day's
 * budget (`../turn/gates`). Aborting the request (the panel's Stop) aborts the upstream call.
 */
import 'server-only'

import { parsePublicPath, SITES } from '@engine/config/sites'

import type { ChatDeps } from '../context'
import { CHAT_LIMITS, wibDay } from '../env'
import { clientAddress } from '../identity'
import { cleanVisitorText } from '../text/untrusted'
import { runTurn } from '../turn'
import { gateTurn } from '../turn/gates'
import type { SiteKey } from '../types'
import { isSameOrigin, localeOf, notFound, readJson, refusal, sessionOf, siteOf } from './common'
import { streamResponse } from './respond'

/** The public id of the item or product a page path names, or `null`. */
export function itemOfPage(site: SiteKey, pagePath: unknown): string | null {
  if (typeof pagePath !== 'string' || !pagePath.startsWith('/') || pagePath.length > 300)
    return null
  let parsed
  try {
    parsed = parsePublicPath(SITES[site], pagePath.split(/[?#]/)[0] ?? '')
  } catch {
    return null
  }
  if (parsed.kind !== 'surface') return null
  if (parsed.surface === 'item' && site === 'gallery') return String(parsed.params.publicId)
  if (parsed.surface === 'product' && site === 'shop') return parsed.params.slug
  return null
}

export async function postMessage(request: Request, deps: ChatDeps): Promise<Response> {
  const site = siteOf(request, deps)
  if (site === null) return notFound()
  const body = await readJson(request)
  const locale = localeOf(body?.locale)
  const refuse = (
    code: Parameters<typeof refusal>[0]['code'],
    status: number,
    retryAfter?: number,
  ) => refusal({ site, locale, code, status, ...(retryAfter ? { retryAfter } : {}) })

  if (!isSameOrigin(request, site, deps)) return refuse('bad_request', 403)
  if (body === null || typeof body.text !== 'string') return refuse('bad_request', 400)
  if (deps.keys === null || deps.model === null) return refuse('unavailable', 503)
  const session = await sessionOf(request, site, deps)
  if (session === null) return refuse('session_required', 401)

  const now = deps.now()
  const address = clientAddress(request.headers) ?? 'unknown'
  const ipWait = deps.limiter.messagesPerIp.take(address, now.getTime())
  if (ipWait > 0) return refuse('rate_limited', 429, ipWait)
  const paceWait = deps.limiter.messagePace.take(session.id, now.getTime())
  if (paceWait > 0) return refuse('rate_limited', 429, paceWait)

  const text = cleanVisitorText(body.text)
  if (text === '') return refuse('bad_request', 400)
  if ([...text].length > CHAT_LIMITS.maxMessageChars) return refuse('too_long', 413)

  const settings = await deps.store.settings(site, locale)
  if (settings === null) return refuse('unavailable', 503)
  const spentTodayUsd = await deps.spend.spent(site, wibDay(now))
  const gate = gateTurn({ session, settings, spentTodayUsd, now })
  if (gate) {
    return refusal({
      site,
      locale,
      code: gate.code,
      status: gate.status,
      settings: gate.handoff ? settings : null,
      ...(gate.retryAfter ? { retryAfter: gate.retryAfter } : {}),
    })
  }
  if (!deps.limiter.begin(session.id)) return refuse('rate_limited', 429, 2)

  return streamResponse(async (emit) => {
    try {
      await runTurn({
        deps,
        session,
        settings,
        site,
        locale,
        text,
        viewingItemId: itemOfPage(site, body.pagePath),
        signal: request.signal,
        emit,
      })
    } finally {
      deps.limiter.end(session.id)
    }
  })
}
