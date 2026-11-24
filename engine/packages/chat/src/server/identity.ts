/**
 * Who a chat request is (AI.md §3.4): the session cookie, the client address and its daily hash.
 *
 * - **`chat_sid`** — HttpOnly, SameSite=Lax, Secure on https, session-scoped (no Max-Age), path
 *   `/api/x/chat`, set only when the visitor opens the chat. It holds the `chat-sessions` id and
 *   an HMAC of it, so it cannot be forged or pointed at another visitor's conversation.
 * - **Keys** are derived from `PAYLOAD_SECRET` with HKDF, one per purpose — no new secret to
 *   provision, and the cookie key and the address salt never coincide.
 * - **The client address** is the one nginx appends to `X-Forwarded-For` (the last entry; the app
 *   binds loopback, so the header cannot be forged by a direct hit). It is used for rate limits in
 *   memory; the transcript keeps only a daily-salted hash (never the address).
 */
import 'server-only'

import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto'

import { secretFrom, type Env } from './env'

export const SESSION_COOKIE = 'chat_sid'
export const COOKIE_PATH = '/api/x/chat'

export type ChatKeys = { readonly cookie: Buffer; readonly ipSalt: Buffer }

/** `null` while `PAYLOAD_SECRET` is unset: the chat then answers `unavailable`. */
export function chatKeys(env: Env = process.env): ChatKeys | null {
  const secret = secretFrom(env, 'PAYLOAD_SECRET')
  if (secret === null) return null
  const derive = (info: string) =>
    Buffer.from(hkdfSync('sha256', secret, 'indies-platform/chat', info, 32))
  return { cookie: derive('chat_sid/v1'), ipSalt: derive('ip-hash/v1') }
}

function mac(key: Buffer, value: string): string {
  return createHmac('sha256', key).update(value).digest('base64url')
}

export function signSessionId(id: string, keys: ChatKeys): string {
  return `${id}.${mac(keys.cookie, id)}`
}

/** The session id a cookie value names, or `null` when it is absent, malformed or forged. */
export function verifySessionCookie(
  value: string | null | undefined,
  keys: ChatKeys,
): string | null {
  if (!value || value.length > 200) return null
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return null
  const id = value.slice(0, dot)
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) return null
  const expected = Buffer.from(mac(keys.cookie, id))
  const given = Buffer.from(value.slice(dot + 1))
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return null
}

export function sessionCookie(value: string, secure: boolean): string {
  return [
    `${SESSION_COOKIE}=${value}`,
    `Path=${COOKIE_PATH}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ')
}

export function clearedSessionCookie(secure: boolean): string {
  return `${sessionCookie('', secure)}; Max-Age=0`
}

/** The address nginx appended to `X-Forwarded-For`, or `null` (a workstation, CI). */
export function clientAddress(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')
  const last = forwarded?.split(',').at(-1)?.trim()
  return last && /^[0-9a-f:.]{2,45}$/i.test(last) ? last : null
}

/** The address hashed with the day's salt: the same visitor links within a WIB day, not beyond. */
export function ipHash(address: string | null, day: string, keys: ChatKeys): string {
  return mac(keys.ipSalt, `${day}|${address ?? 'unknown'}`)
}
