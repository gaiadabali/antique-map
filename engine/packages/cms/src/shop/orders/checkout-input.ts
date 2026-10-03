/**
 * The checkout's contact and delivery details, validated on the server (TASKS.md 6.3.a "validated
 * on the server, Indonesia only"; COMMERCE.md §3). The form may check the same things for speed;
 * only this decides. Nothing here throws on visitor input: a bad field is named, never guessed at.
 *
 * - **Contact:** a name (one field), a WhatsApp number normalised to E.164 — a foreign number is
 *   accepted, buyers are often visitors; a local `08…` becomes `+628…` — an email, and the language.
 * - **Delivery:** the address as text and optional notes for the driver, each ≤ 500 characters;
 *   the pin as finite decimal degrees. Whether the pin is inside Indonesia and within a store's
 *   reach is assignment's question (`./assign`), answered as a refusal, not a field error.
 * - An optional gift note, ≤ 500 characters.
 */
import { isValidPin, type Pin } from './geo'

export type CheckoutField =
  | 'contact.name'
  | 'contact.whatsapp'
  | 'contact.email'
  | 'contact.locale'
  | 'delivery.address'
  | 'delivery.notes'
  | 'delivery.pin'
  | 'giftNote'

/** What the checkout form posts, as untrusted values. */
export type CheckoutDetailsInput = {
  readonly contact: {
    readonly name: unknown
    readonly whatsapp: unknown
    readonly email: unknown
    readonly locale: unknown
  }
  readonly delivery: {
    readonly address: unknown
    readonly notes?: unknown
    /** A number, or a decimal string from a form field. */
    readonly lat: unknown
    readonly lng: unknown
  }
  readonly giftNote?: unknown
}

export type CheckoutContact = {
  readonly name: string
  /** E.164: `+` and 8–15 digits. */
  readonly whatsapp: string
  /** Trimmed and lower-case. */
  readonly email: string
  readonly locale: 'en' | 'id'
}

export type CheckoutDetails = {
  readonly contact: CheckoutContact
  readonly delivery: { readonly address: string; readonly notes: string | null } & Pin
  readonly giftNote: string | null
}

export type CheckoutDetailsCheck =
  | { readonly ok: true; readonly details: CheckoutDetails }
  | { readonly ok: false; readonly fields: readonly CheckoutField[] }

export const TEXT_MAX = 500
export const NAME_MAX = 120
const EMAIL_MAX = 254
const E164 = /^\+[1-9]\d{7,14}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DECIMAL = /^-?\d{1,3}(\.\d{1,12})?$/
// eslint-disable-next-line no-control-regex -- refusing control characters is the point
const CONTROL_EXCEPT_LINES = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
// eslint-disable-next-line no-control-regex -- refusing control characters is the point
const CONTROL = /[\u0000-\u001f\u007f]/

/** A WhatsApp number as typed → E.164, or `null` if it cannot be one. */
export function normaliseWhatsApp(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 40) return null
  let digits = input.trim().replace(/[\s\-().]/g, '')
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`
  else if (digits.startsWith('0')) digits = `+62${digits.slice(1)}`
  else if (digits.startsWith('62')) digits = `+${digits}`
  else if (digits.startsWith('8')) digits = `+62${digits}`
  return E164.test(digits) ? digits : null
}

/** An email as typed → trimmed, lower-case, or `null`. */
export function normaliseEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const email = input.trim().toLowerCase()
  return email.length <= EMAIL_MAX && EMAIL.test(email) ? email : null
}

/** Required text: trimmed, 1–`max` characters, no control characters (`lines` allows newlines). */
function text(input: unknown, max: number, lines: boolean): string | null {
  if (typeof input !== 'string') return null
  const value = input.trim()
  if (value === '' || value.length > max) return null
  return (lines ? CONTROL_EXCEPT_LINES : CONTROL).test(value) ? null : value
}

/** Optional text: absent or blank is `null`; present must pass `text`. `undefined` = refused. */
function optionalText(input: unknown, max: number): string | null | undefined {
  if (input === undefined || input === null) return null
  if (typeof input === 'string' && input.trim() === '') return null
  return text(input, max, true) ?? undefined
}

function coordinate(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  if (typeof input === 'string' && DECIMAL.test(input.trim())) return Number(input.trim())
  return null
}

export function validateCheckoutDetails(input: CheckoutDetailsInput): CheckoutDetailsCheck {
  const fields: CheckoutField[] = []
  const contact = input?.contact ?? ({} as CheckoutDetailsInput['contact'])
  const delivery = input?.delivery ?? ({} as CheckoutDetailsInput['delivery'])

  const name = text(contact.name, NAME_MAX, false)
  const whatsapp = normaliseWhatsApp(contact.whatsapp)
  const email = normaliseEmail(contact.email)
  const locale = contact.locale === 'en' || contact.locale === 'id' ? contact.locale : null
  const address = text(delivery.address, TEXT_MAX, true)
  const notes = optionalText(delivery.notes, TEXT_MAX)
  const giftNote = optionalText(input?.giftNote, TEXT_MAX)
  const pin = { lat: coordinate(delivery.lat), lng: coordinate(delivery.lng) }

  if (name === null) fields.push('contact.name')
  if (whatsapp === null) fields.push('contact.whatsapp')
  if (email === null) fields.push('contact.email')
  if (locale === null) fields.push('contact.locale')
  if (address === null) fields.push('delivery.address')
  if (notes === undefined) fields.push('delivery.notes')
  if (!isValidPin(pin)) fields.push('delivery.pin')
  if (giftNote === undefined) fields.push('giftNote')
  if (fields.length > 0) return { ok: false, fields }

  return {
    ok: true,
    details: {
      contact: { name: name!, whatsapp: whatsapp!, email: email!, locale: locale! },
      delivery: { address: address!, notes: notes ?? null, lat: pin.lat!, lng: pin.lng! },
      giftNote: giftNote ?? null,
    },
  }
}
