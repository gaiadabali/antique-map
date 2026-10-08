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
  LEAD_WINDOW_SECONDS,
  type CreateLeadResult,
  type LeadDeps,
} from '../../../../server/leads'

import { LEAD_CONSENT_VERSION } from '../../../../sites/gallery/contact/state'

import { readCappedText } from './body'
import { scopeKey, type LeadIdempotency, type StoredAnswer } from './idempotency'

/** The consent line the two forms show; stored on the lead with the time it was given. */
export { LEAD_CONSENT_VERSION } from '../../../../sites/gallery/contact/state'

/** The body's cap, read before it is parsed: a form's text is far smaller than this. */
export const MAX_BODY_BYTES = 16 * 1024

/** The idempotency key's longest accepted form (a UUID is 36). */
const MAX_KEY_LENGTH = 64

/** The limit's window is a fixed hour (`server/leads/rate`): a refused post may wait up to one. */
const RETRY_AFTER_SECONDS = String(LEAD_WINDOW_SECONDS)

/** The body's own keys: the kind, the visitor's fields and the Turnstile answer. */
const BODY_FIELDS = new Set(['kind', 'input', 'turnstileToken'])

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
const VISITOR_FIELDS = [
  'name',
  'whatsapp',
  'email',
  'preferredChannel',
  'message',
  'locale',
  'items',
  'consent',
] as const

function visitorInput(raw: Record<string, unknown>): Record<string, unknown> | null {
  const input = raw.input
  if (input === undefined) return {}
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return null
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
      return json({ error: 'rate' }, 429, { 'retry-after': RETRY_AFTER_SECONDS })
    case 'challenge':
      return json({ error: 'challenge' }, 403)
    case 'unavailable':
      return json({ error: 'unavailable' }, 503)
  }
}

/** The answers worth replaying: the lead was made, or the same body was refused as invalid. */
const keepAnswer = (answer: StoredAnswer): boolean => answer.status === 201 || answer.status === 422

async function answerOf(response: Response): Promise<StoredAnswer> {
  return { status: response.status, body: await response.text() }
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

  // 2. The idempotency key's shape, before the body is read.
  const key = request.headers.get('idempotency-key')?.trim() ?? ''
  if (key.length > MAX_KEY_LENGTH) return json(INVALID, 422)

  // 3. The body, capped while it is read — never buffered past the cap, never parsed over it.
  const body = await readCappedText(request, MAX_BODY_BYTES)
  if (body === 'too-large') return json({ error: 'payload-too-large' }, 413)

  const ip = clientAddress(request.headers)
  const handle = async () => answerOf(await handleBody(body, ip, deps))
  if (key.length === 0) return replay(await handle())
  // A repeat of this key, from this address, with this body: the first answer again.
  return replay(await idempotency.run(scopeKey(ip, key, body), handle, keepAnswer))
}

function replay(answer: StoredAnswer): Response {
  return new Response(answer.body, {
    status: answer.status,
    headers: {
      'content-type': 'application/json',
      ...(answer.status === 429 ? { 'retry-after': RETRY_AFTER_SECONDS } : {}),
    },
  })
}

async function handleBody(body: string, ip: string | null, deps: LeadDeps): Promise<Response> {
  let raw: unknown
  try {
    raw = JSON.parse(body) as unknown
  } catch {
    return json(INVALID, 422)
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return json(INVALID, 422)
  const parsed = raw as Record<string, unknown>

  // 4. The body's own keys are the route's three; anything else refuses the post (V4).
  if (Object.keys(parsed).some((name) => !BODY_FIELDS.has(name))) return json(INVALID, 422)

  // 5. The kind is the route's allow-list, never the visitor's free text.
  const kind = parsed.kind
  if (typeof kind !== 'string' || !KINDS.includes(kind as LeadRouteKind)) {
    return json(INVALID, 422)
  }

  // 6. The visitor's fields, picked by name; `items` is the ask form's work references alone.
  const input = visitorInput(parsed)
  if (input === null) return json(INVALID, 422)
  if (kind !== 'ask' && input.items !== undefined) return json(INVALID, 422)

  const token = typeof parsed.turnstileToken === 'string' ? parsed.turnstileToken : null

  // 7. The lead service: token shape → limit → Turnstile → validate → store → owner email.
  const result = await createLead(deps, {
    input,
    context: {
      kind: kind as LeadRouteKind,
      site: 'gallery',
      source: 'form',
      consentVersion: LEAD_CONSENT_VERSION,
    },
    turnstileToken: token,
    ip,
  })
  return resultToResponse(result)
}
