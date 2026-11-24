/**
 * The partner session cookie (the partner sign-in, 2026-10-20): `<id>.<version>.<expiry>.<mac>`,
 * HMAC-SHA256 over the first three with a key derived from `PAYLOAD_SECRET` for this one purpose
 * (HKDF, its own label), so no new secret is needed and the staff session's key is never reused as
 * is. The cookie names a partner and the session version it was issued under; the store re-checks
 * both on every read (`./current`), so a sign-out, a new password or the owner turning sign-in off
 * ends every session at once (SECURITY.md A5). HttpOnly, SameSite=Lax, Secure in production.
 */
import 'server-only'

import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto'

export const PARTNER_COOKIE = 'oei_partner'
/** Twelve hours: a working day's session, then sign in again. */
export const PARTNER_SESSION_SECONDS = 12 * 60 * 60

export type PartnerSession = {
  readonly id: number
  readonly version: number
  readonly expires: number
}

let key: Buffer | null = null

function sessionKey(): Buffer {
  if (key !== null) return key
  const secret = process.env.PAYLOAD_SECRET ?? ''
  if (secret.length < 16) throw new Error('PAYLOAD_SECRET is needed to sign partner sessions')
  key = Buffer.from(hkdfSync('sha256', secret, 'oei-partner-session', 'oei-partner-session-v1', 32))
  return key
}

const mac = (body: string): string =>
  createHmac('sha256', sessionKey()).update(body).digest('base64url')

/** The cookie's value for a session issued now. */
export function issuePartnerSession(id: number, version: number, now: number = Date.now()): string {
  const expires = Math.floor(now / 1000) + PARTNER_SESSION_SECONDS
  const body = `${id}.${version}.${expires}`
  return `${body}.${mac(body)}`
}

/** The session a cookie carries, or `null` for anything forged, malformed or expired. */
export function readPartnerSession(
  value: string | undefined,
  now: number = Date.now(),
): PartnerSession | null {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 4) return null
  const [id, version, expires, given] = parts as [string, string, string, string]
  if (!/^\d{1,12}$/.test(id) || !/^\d{1,9}$/.test(version) || !/^\d{1,12}$/.test(expires)) {
    return null
  }
  const expected = Buffer.from(mac(`${id}.${version}.${expires}`))
  const actual = Buffer.from(given)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  if (Number(expires) * 1000 <= now) return null
  return { id: Number(id), version: Number(version), expires: Number(expires) }
}

/** The cookie's attributes (`cookies().set`). */
export function partnerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PARTNER_SESSION_SECONDS,
  }
}
