'use client'

/**
 * The panel's HTTP edge (AI.md §2.2, `docs/reports/workers/8.1.md` "The route contract"): start
 * and delete the session, send one turn and read its stream, post the consent form. Every call is
 * same-origin `fetch`, `credentials: 'same-origin'` so the `chat_sid` cookie travels. The message
 * body carries only `text`, `locale` and `pagePath` — the server resolves the item or product the
 * page names from `pagePath` itself (`itemOfPage()`); the client never sends a title or a price.
 */
import { parseSseChunk } from './stream'
import type {
  ChatErrorCode,
  ChatEvent,
  ChatLimits,
  ConsentPayload,
  ConsentResult,
  SiteLocale,
  StartSessionResult,
} from './types'

const JSON_HEADERS = { 'content-type': 'application/json' } as const

async function postJson(url: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: JSON_HEADERS,
    credentials: 'same-origin',
    body: JSON.stringify(body),
    signal,
  })
}

export async function startChatSession(input: {
  readonly turnstileToken: string
  readonly locale: SiteLocale
}): Promise<StartSessionResult> {
  try {
    const response = await postJson('/api/x/chat/session', input)
    const body = (await response.json().catch(() => null)) as
      | { ok: true; resumed: boolean; limits?: ChatLimits }
      | { error: { code: ChatErrorCode; message: string } }
      | null
    if (body !== null && 'ok' in body && body.ok) {
      return body.resumed
        ? { ok: true, resumed: true }
        : { ok: true, resumed: false, limits: body.limits as ChatLimits }
    }
    const error = body !== null && 'error' in body ? body.error : null
    return {
      ok: false,
      code: error?.code ?? 'unavailable',
      message: error?.message ?? '',
    }
  } catch {
    return { ok: false, code: 'unavailable', message: '' }
  }
}

export async function deleteChatSession(): Promise<void> {
  try {
    await fetch('/api/x/chat/session', { method: 'DELETE', credentials: 'same-origin' })
  } catch {
    // Deleting is best-effort: the visitor is closing the panel either way.
  }
}

export function newIdempotencyKey(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function postConsent(
  input: ConsentPayload & { readonly locale: SiteLocale },
): Promise<ConsentResult> {
  try {
    const response = await postJson('/api/x/chat/consent', input)
    const body = (await response.json().catch(() => null)) as
      | { ok: true; reference: string }
      | { error: { code: string; message: string } }
      | null
    if (body !== null && 'ok' in body && body.ok) return { ok: true, reference: body.reference }
    const error = body !== null && 'error' in body ? body.error : null
    return { ok: false, code: error?.code ?? 'unavailable', message: error?.message ?? '' }
  } catch {
    return { ok: false, code: 'unavailable', message: '' }
  }
}

export type StreamHandle = { readonly stop: () => void }

/**
 * Posts one turn and reads its stream, calling `onEvent` for each parsed `ChatEvent` as it
 * arrives. `onRetryAfter` is called once, from the response's `Retry-After` header, for a
 * rate-limited or budget-exhausted refusal — the stream's own `error` event carries no such field.
 */
export function sendChatMessage(
  input: { readonly text: string; readonly locale: SiteLocale; readonly pagePath: string },
  onEvent: (event: ChatEvent) => void,
  onRetryAfter: (seconds: number) => void,
  onNetworkError: (message: string) => void,
): StreamHandle {
  const controller = new AbortController()
  void run()
  return { stop: () => controller.abort() }

  async function run(): Promise<void> {
    let response: Response
    try {
      response = await postJson('/api/x/chat/message', input, controller.signal)
    } catch {
      if (!controller.signal.aborted) onNetworkError('network')
      return
    }
    const retryAfter = response.headers.get('retry-after')
    if (retryAfter !== null && /^\d+$/.test(retryAfter)) onRetryAfter(Number(retryAfter))
    if (response.body === null) {
      onNetworkError('network')
      return
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parsed = parseSseChunk(buffer)
        buffer = parsed.rest
        for (const event of parsed.events) onEvent(event)
      }
    } catch {
      if (!controller.signal.aborted) onNetworkError('network')
    }
  }
}

/** Links only to our own origin, `wa.me` or `mailto:` (AI.md §3.3) — the client re-checks too. */
export function isAllowedHandoffHref(href: string, ownOrigin: string): boolean {
  if (href.startsWith('mailto:')) return true
  const url = parseUrl(href)
  if (url === null) return false
  if (url.protocol === 'https:' && url.host === 'wa.me') return true
  return isOwnOrigin(url, ownOrigin)
}

/** A card links only into our own site: a same-origin path or an absolute URL on our origin. */
export function isAllowedCardHref(href: string, ownOrigin: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/\\')) return true
  const url = parseUrl(href)
  return url !== null && isOwnOrigin(url, ownOrigin)
}

function parseUrl(href: string): URL | null {
  try {
    return new URL(href)
  } catch {
    return null
  }
}

function isOwnOrigin(url: URL, ownOrigin: string): boolean {
  if (ownOrigin === '') return false
  const own = parseUrl(ownOrigin)
  return own !== null && url.origin === own.origin
}
