/**
 * `POST /api/x/chat/consent` — the visitor's consent click (AI.md §4). The only way the chat
 * creates a lead: the form the server showed (`lead_form`) posts the visitor's name and contact
 * here, with the single-use consent token and `consent: true`. The details go straight to the
 * lead service; the model never sees them and learns only the reference, on its next turn.
 *
 * Body: `{ consentToken, consent: true, name, whatsapp?, email?, preferredChannel, message?,
 * idempotencyKey }`. Answers `200 { ok: true, reference }` — the same reference again for a
 * repeat of the same submission (a double tap makes one lead). The body is never logged.
 */
import 'server-only'

import type { ChatDeps } from '../context'
import { clientAddress } from '../identity'
import { CONSENT_VERSION } from '../lexicon'
import { cleanVisitorText } from '../text/untrusted'
import { isSameOrigin, jsonError, localeOf, notFound, readJson, sessionOf, siteOf } from './common'
import { jsonResponse } from './respond'

/** `+62 812-3456 7890` → `+6281234567890`, or `null` unless it is E.164. */
export function e164(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const compact = value.replace(/[\s().-]/g, '')
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : null
}

export function emailOf(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/.test(email) ? email : null
}

const text = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() !== '' && value.length <= max
    ? cleanVisitorText(value)
    : null

export async function postConsent(request: Request, deps: ChatDeps): Promise<Response> {
  const site = siteOf(request, deps)
  if (site === null) return notFound()
  const body = await readJson(request)
  const locale = localeOf(body?.locale)
  if (!isSameOrigin(request, site, deps)) return jsonError(site, locale, 'bad_request', 403)
  if (body === null) return jsonError(site, locale, 'bad_request', 400)
  const session = await sessionOf(request, site, deps)
  if (session === null) return jsonError(site, locale, 'session_required', 401)

  const token = typeof body.consentToken === 'string' ? body.consentToken : ''
  const key = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : ''
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token) || !/^[A-Za-z0-9_-]{8,100}$/.test(key)) {
    return jsonError(site, locale, 'bad_request', 400)
  }
  const replayed = deps.consents.replay(token, key)
  if (replayed !== null) return jsonResponse({ ok: true, reference: replayed }, 200)
  // The click itself: nothing is created without it.
  if (body.consent !== true) return jsonError(site, locale, 'bad_request', 400)
  const name = text(body.name, 160)
  const whatsapp = body.whatsapp === undefined || body.whatsapp === '' ? null : e164(body.whatsapp)
  const email = body.email === undefined || body.email === '' ? null : emailOf(body.email)
  const preferred = body.preferredChannel
  const message = body.message === undefined || body.message === '' ? '' : text(body.message, 2000)
  if (
    name === null ||
    message === null ||
    (whatsapp === null && email === null) ||
    (body.whatsapp && whatsapp === null) ||
    (body.email && email === null) ||
    (preferred !== 'whatsapp' && preferred !== 'email') ||
    (preferred === 'whatsapp' && whatsapp === null) ||
    (preferred === 'email' && email === null)
  ) {
    return jsonError(site, locale, 'bad_request', 400)
  }

  const wait = deps.limiter.leadsPerIp.take(
    clientAddress(request.headers) ?? 'unknown',
    deps.now().getTime(),
  )
  if (wait > 0) return jsonError(site, locale, 'rate_limited', 429, { 'Retry-After': String(wait) })

  const pending = deps.consents.claim(token, session.id)
  if (pending === null) return jsonError(site, locale, 'bad_request', 410)
  if (pending.site !== site) {
    deps.consents.release(token)
    return jsonError(site, locale, 'bad_request', 410)
  }
  const items = pending.itemIds.length > 0 ? `\n\nItems: ${pending.itemIds.join(', ')}` : ''
  let lead: { reference: string; id: string }
  try {
    lead = await deps.store.createLead({
      site,
      kind: pending.kind,
      sessionId: session.id,
      name,
      whatsapp,
      email,
      preferredChannel: preferred,
      message: `${pending.summary}${message ? `\n\n${message}` : ''}${items}`.slice(0, 2000),
      locale: pending.locale,
      consentVersion: CONSENT_VERSION,
      consentAt: deps.now().toISOString(),
      workIds: site === 'gallery' ? await deps.store.workIdsOf(pending.itemIds) : [],
    })
  } catch (error) {
    deps.consents.release(token)
    throw error
  }
  deps.consents.complete(token, key, lead.reference)
  await deps.store.linkLead(session.id, lead.id)
  return jsonResponse({ ok: true, reference: lead.reference }, 200)
}
