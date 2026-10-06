/**
 * `POST /api/x/leads` (5.3.c; AI.md §4): the gallery's public lead forms' one target. JSON only,
 * the body capped before it is parsed, an idempotency key answered without calling the service
 * twice, and `kind` from a closed allow-list — the route never passes the raw body as the
 * service's `input`; it picks what the visitor sent by name and the lead service's one validator
 * (SECURITY.md V1) is still the authority. Every status the service can answer has its HTTP
 * shape here, and no stored field — the lead's id included — is ever echoed back.
 *
 * This file stays free of `'use server'` and of the process's real dependencies (`./route` mounts
 * it with `leadDeps()`), so a test runs it on a fake `LeadDeps`.
 */
import { clientAddress } from '../../../../server/chat/identity'
import {
  createLead,
  LEAD_ERROR_KEYS,
  type CreateLeadResult,
  type LeadDeps,
} from '../../../../server/leads'

import { LEAD_CONSENT_VERSION } from '../../../../sites/gallery/contact/state'

import { LeadIdempotency } from './idempotency'

/** The consent line the two forms show; stored on the lead with the time it was given. */
export { LEAD_CONSENT_VERSION } from '../../../../sites/gallery/contact/state'

/** The body's cap, read before it is parsed: a form's text is far smaller than this. */
export const MAX_BODY_BYTES = 16 * 1024

/** The kinds the gallery's own forms may ask for; the service's other kinds are other callers'. */
const KINDS = ['sell', 'contact', 'ask'] as const
type LeadRouteKind = (typeof KINDS)[number]

const json = (body: unknown, status: number, headers?: HeadersInit): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

const INVALID = { errors: { form: LEAD_ERROR_KEYS.invalid } }

/** The visitor's fields the route picks by name; anything else in `input` refuses the post. */
const VISITOR_FIELDS = ['name', 'whatsapp', 'email', 'preferredChannel', 'message', 'locale', 'items', 'consent'] as const

function visitorInput(raw: Record<string, unknown>): Record<string, unknown> | null {
  const input = raw.input
  if (input === null || typeof input !== 'object') return {}
  const source = input as Record<string, unknown>
  // The route never passes the raw body on: it picks what a visitor may send. A key outside
  // that list is not dropped quietly — the form never posts one, so the post is refused.
  for (const key of Object.keys(source)) {
    if (!(VISITOR_FIELDS as readonly string[]).includes(key)) return null
  }
  const picked: Record<string, unknown> = {}
  for (const key of VISITOR_FIELDS) {
    if (source[key] !== undefined) picked[key] = source[key]
  }
  return picked
}

function resultToResponse(result: CreateLeadResult): Response {
  if (result.ok) return json({ ok: true }, 201)
  switch (result.reason) {
    case 'invalid':
      return json({ errors: result.errors }, 422)
    case 'rate':
      // The limit is a fixed one-minute window (`server/leads/rate`).
      return json({ error: 'rate' }, 429, { 'retry-after': '60' })
    case 'challenge':
      return json({ error: 'challenge' }, 403)
    case 'unavailable':
      return json({ error: 'unavailable' }, 503)
  }
}

/** The route's one handler, on the process's `LeadDeps` (or a test's). */
export async function handleLeadPost(
  request: Request,
  deps: LeadDeps,
  idempotency: LeadIdempotency,
): Promise<Response> {
  // 1. JSON only: any other content type — a file renamed into the form's encoding included —
  //    is refused before a byte is read.
  const type = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
  if (type !== 'application/json') return json({ error: 'unsupported-media-type' }, 415)

  // 2. The idempotency key, bounded and answered first: a repeat is the first result again.
  const key = request.headers.get('idempotency-key')?.trim() ?? ''
  const hasKey = key.length > 0
  if (hasKey && key.length > 64) return json(INVALID, 422)
  if (hasKey) {
    const replay = idempotency.get(key)
    if (replay !== null) return new Response(replay.body, { status: replay.status })
  }

  // 3. The body, capped before it is parsed.
  const declared = request.headers.get('content-length')
  const body = await request.text()
  if (
    (declared !== null && Number(declared) > MAX_BODY_BYTES) ||
    Buffer.byteLength(body) > MAX_BODY_BYTES
  ) {
    return json({ error: 'payload-too-large' }, 413)
  }

  let raw: unknown
  try {
    raw = JSON.parse(body) as unknown
  } catch {
    return json(INVALID, 422)
  }
  if (raw === null || typeof raw !== 'object') return json(INVALID, 422)
  const parsed = raw as Record<string, unknown>

  // 4. The kind is the route's allow-list, never the visitor's free text.
  const kind = parsed.kind
  if (typeof kind !== 'string' || !KINDS.includes(kind as LeadRouteKind)) {
    return json(INVALID, 422)
  }

  // 5. `items` is the ask form's work references alone.
  const input = visitorInput(parsed)
  if (input === null) return json(INVALID, 422)
  if (kind !== 'ask' && Array.isArray(input.items) && input.items.length > 0) {
    return json(INVALID, 422)
  }

  const token = typeof parsed.turnstileToken === 'string' ? parsed.turnstileToken : null

  // 6. The lead service: token shape → limit → Turnstile → validate → store → owner email.
  const result = await createLead(deps, {
    input,
    context: { kind: kind as LeadRouteKind, site: 'gallery', source: 'form', consentVersion: LEAD_CONSENT_VERSION },
    turnstileToken: token,
    ip: clientAddress(request.headers),
  })
  const response = resultToResponse(result)
  if (hasKey) {
    idempotency.put(key, response.status, JSON.stringify(await response.clone().json()))
  }
  return response
}
