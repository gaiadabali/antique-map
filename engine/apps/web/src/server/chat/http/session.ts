/**
 * `POST /api/x/chat/session` — the visitor opens the chat (AI.md §1, §3.2, §3.4). The server
 * verifies the Turnstile token (`siteverify`, through `TurnstileVerifier`), and only then creates
 * the `chat-sessions` record and sets the `chat_sid` cookie, bound to that pass. With a valid
 * cookie already, the same call is the re-challenge: a fresh token resets the count. 6 new
 * sessions per hour per address.
 *
 * `DELETE /api/x/chat/session` — the visitor deletes the conversation: the record goes, the
 * cookie is cleared.
 */
import 'server-only'

import { isLocalHostname, requestHostname, siteOrigin } from '@engine/config/sites'

import type { ChatDeps } from '../context'
import { CHAT_LIMITS, wibDay } from '../env'
import {
  clearedSessionCookie,
  clientAddress,
  ipHash,
  sessionCookie,
  signSessionId,
} from '../identity'
import { PASS_LABEL, userMessages } from '../turn/gates'
import type { SiteKey } from '../types'
import {
  isSameOrigin,
  isSecure,
  jsonError,
  localeOf,
  notFound,
  readJson,
  sessionOf,
  siteOf,
} from './common'
import { jsonResponse } from './respond'

async function turnstilePasses(
  token: string,
  request: Request,
  site: SiteKey,
  deps: ChatDeps,
): Promise<boolean> {
  if (deps.turnstile === null) return false
  const result = await deps.turnstile.verify(token, clientAddress(request.headers), request.signal)
  if (!result.success) return false
  const expected = requestHostname(new URL(siteOrigin(site, deps.env) ?? 'https://invalid').host)
  // Cloudflare's test keys answer for example.com; a workstation's host is not checked.
  if (expected === null || isLocalHostname(expected)) return true
  return result.hostname === expected
}

export async function startSession(request: Request, deps: ChatDeps): Promise<Response> {
  const site = siteOf(request, deps)
  if (site === null) return notFound()
  const body = await readJson(request)
  const locale = localeOf(body?.locale)
  if (!isSameOrigin(request, site, deps)) return jsonError(site, locale, 'bad_request', 403)
  if (body === null) return jsonError(site, locale, 'bad_request', 400)
  if (deps.keys === null || deps.turnstile === null || deps.model === null) {
    return jsonError(site, locale, 'unavailable', 503)
  }
  const token = body.turnstileToken
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return jsonError(site, locale, 'challenge_required', 400)
  }
  const settings = await deps.store.settings(site, locale)
  if (settings === null) return jsonError(site, locale, 'unavailable', 503)
  if (!settings.ai.chatEnabled) return jsonError(site, locale, 'disabled', 503)

  const existing = await sessionOf(request, site, deps)
  if (existing !== null) {
    if (!(await turnstilePasses(token, request, site, deps))) {
      return jsonError(site, locale, 'challenge_required', 403)
    }
    await deps.store.addLabels(existing.id, [`${PASS_LABEL}${userMessages(existing)}`])
    return jsonResponse({ ok: true, resumed: true }, 200)
  }

  const address = clientAddress(request.headers)
  const now = deps.now()
  const wait = deps.limiter.sessionsPerIp.take(address ?? 'unknown', now.getTime())
  if (wait > 0) return jsonError(site, locale, 'rate_limited', 429, { 'Retry-After': String(wait) })
  if (!(await turnstilePasses(token, request, site, deps))) {
    return jsonError(site, locale, 'challenge_required', 403)
  }
  const session = await deps.store.createSession({
    site,
    locale,
    startedAt: now.toISOString(),
    ipHash: ipHash(address, wibDay(now), deps.keys),
    labels: [`${PASS_LABEL}0`, 'turnstile:verified'],
  })
  return jsonResponse(
    {
      ok: true,
      resumed: false,
      limits: {
        maxMessageChars: CHAT_LIMITS.maxMessageChars,
        messagesPerSession: CHAT_LIMITS.messagesPerSession,
      },
    },
    200,
    { 'Set-Cookie': sessionCookie(signSessionId(session.id, deps.keys), isSecure(site, deps)) },
  )
}

export async function deleteSession(request: Request, deps: ChatDeps): Promise<Response> {
  const site = siteOf(request, deps)
  if (site === null) return notFound()
  if (!isSameOrigin(request, site, deps)) return jsonError(site, 'en', 'bad_request', 403)
  const session = await sessionOf(request, site, deps)
  if (session !== null) await deps.store.deleteSession(session.id)
  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'Set-Cookie': clearedSessionCookie(isSecure(site, deps)),
    },
  })
}
