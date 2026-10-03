/**
 * What every chat route does first: pick the site from `Host` (never a header the proxy set —
 * a request the proxy did not see would carry the client's), refuse a cross-site write (the
 * session cookie authenticates, so a write must come from the site's own origin), read a small
 * JSON body, and find the session from its signed cookie.
 */
import 'server-only'

import { siteFromHost, siteOrigin, SITE_LOCALES } from '@engine/config/sites'

import type { ChatDeps } from '../context'
import { CHAT_LIMITS } from '../env'
import { readCookie, SESSION_COOKIE, verifySessionCookie } from '../identity'
import { chatCopy } from '../lexicon'
import { buildHandoffs } from '../tools/handoff'
import type {
  ChatErrorCode,
  ChatEvent,
  ChatSessionRecord,
  ChatSettings,
  SiteKey,
  SiteLocale,
} from '../types'
import { eventsResponse, jsonResponse } from './respond'

/** The site whose canonical host this request named, or `null`. */
export function siteOf(request: Request, deps: ChatDeps): SiteKey | null {
  const host = siteFromHost(request.headers.get('host'), deps.env)
  return host !== null && host.canonical ? host.site : null
}

/** A write from the site's own origin: `Origin` matches, or the browser says same-origin. */
export function isSameOrigin(request: Request, site: SiteKey, deps: ChatDeps): boolean {
  const origin = request.headers.get('origin')
  if (origin !== null) return origin === siteOrigin(site, deps.env)
  return request.headers.get('sec-fetch-site') === 'same-origin'
}

export function localeOf(value: unknown): SiteLocale {
  return (SITE_LOCALES as readonly unknown[]).includes(value) ? (value as SiteLocale) : 'en'
}

/** The body as JSON, or `null` when it is too large, not JSON or not an object. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (declared > CHAT_LIMITS.maxBodyBytes) return null
  let text: string
  try {
    text = await request.text()
  } catch {
    return null
  }
  if (Buffer.byteLength(text) > CHAT_LIMITS.maxBodyBytes) return null
  try {
    const value: unknown = JSON.parse(text)
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** The session the cookie names, when it is this site's. */
export async function sessionOf(
  request: Request,
  site: SiteKey,
  deps: ChatDeps,
): Promise<ChatSessionRecord | null> {
  if (deps.keys === null) return null
  const id = verifySessionCookie(
    readCookie(request.headers.get('cookie'), SESSION_COOKIE),
    deps.keys,
  )
  if (id === null) return null
  const session = await deps.store.getSession(id)
  return session !== null && session.site === site ? session : null
}

export function isSecure(site: SiteKey, deps: ChatDeps): boolean {
  return siteOrigin(site, deps.env)?.startsWith('https://') ?? true
}

/** A refusal as the stream the panel reads: the handoff buttons (when settings allow), then the error. */
export function refusal(input: {
  readonly site: SiteKey
  readonly locale: SiteLocale
  readonly code: ChatErrorCode
  readonly status: number
  readonly settings?: ChatSettings | null
  readonly retryAfter?: number
}): Response {
  const t = chatCopy(input.locale, input.site)
  const events: ChatEvent[] = input.settings
    ? buildHandoffs({
        site: input.site,
        settings: input.settings,
        t,
        topic: 'general',
        items: [],
        summary: null,
      }).map((handoff) => ({ type: 'handoff', ...handoff }))
    : []
  events.push({ type: 'error', code: input.code, message: t(`error.${input.code}`) })
  return eventsResponse(
    events,
    input.status,
    input.retryAfter ? { 'Retry-After': String(input.retryAfter) } : {},
  )
}

/** A JSON error for the session and consent routes. */
export function jsonError(
  site: SiteKey | null,
  locale: SiteLocale,
  code: ChatErrorCode,
  status: number,
  headers: Readonly<Record<string, string>> = {},
): Response {
  const message = site === null ? code : chatCopy(locale, site)(`error.${code}`)
  return jsonResponse({ error: { code, message } }, status, headers)
}

export const notFound = () =>
  new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
