/**
 * A work's identifiers and single values (TASKS.md 8.2.a; CONTENT-MODEL.md §1): the `workUid`
 * sister sync and redirects key on, the stock number the gallery has always used, a language tag,
 * the rights a reproduction rests on and an acquisition's cost. Every save. Pure.
 */
import { CURRENCY_CODES } from '@engine/config/constants'

import { PRINTABLE_RIGHTS, type RightsStatus } from '../collections/works/vocabulary'

/**
 * `<prefix>-<digits>` — the prefix is C1's `ids.workUidPrefix` (`^[A-Z][A-Z0-9]{1,7}$`), the
 * digits at least six. `@engine/cache`'s `workTag()` checks the same shape (a test holds them).
 */
export const WORK_UID_PATTERN = /^[A-Z][A-Z0-9]{1,7}-[0-9]{6,16}$/
export const WORK_UID_DIGITS = 6

/** The `n`th uid under `prefix`: `IG-000123`. */
export function formatWorkUid(prefix: string, n: number): string {
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError(`not a work number: ${n}`)
  const uid = `${prefix}-${String(n).padStart(WORK_UID_DIGITS, '0')}`
  if (!WORK_UID_PATTERN.test(uid)) throw new TypeError(`not a work uid prefix: "${prefix}"`)
  return uid
}

export function workUidError(value: unknown, prefix: string | null): string | null {
  if (typeof value !== 'string' || !WORK_UID_PATTERN.test(value)) {
    return 'A work uid is the brand’s prefix, a hyphen and its number: IG-000123.'
  }
  if (prefix !== null && !value.startsWith(`${prefix}-`)) {
    return `This brand’s work uids start with ${prefix}-.`
  }
  return null
}

/** The stock number against the brand's own pattern (C1 `ids.stockNumberPattern`), if it has one. */
export function stockNumberError(value: unknown, pattern: string | null): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || value.trim() !== value || value.length > 40) {
    return 'A stock number is a short code with no spaces around it, such as M.1044.'
  }
  if (pattern !== null && !new RegExp(pattern).test(value)) {
    return `This is not one of this brand’s stock numbers (they match ${pattern}).`
  }
  return null
}

/** A BCP-47 language tag (`nl`, `la`, `ms-Arab`), the `lang` a page sets on the text. */
export function languageTagError(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || value.length > 35) return 'A language tag such as nl, la or ms.'
  try {
    const [canonical] = Intl.getCanonicalLocales(value)
    return canonical ? null : 'A language tag such as nl, la or ms.'
  } catch {
    return 'A language tag such as nl, la or ms.'
  }
}

export type Rights = {
  readonly status?: RightsStatus | null
  readonly holder?: string | null
  readonly licenceRef?: string | null
  readonly territories?: readonly string[] | null
  readonly printAllowed?: boolean | null
}

/** ISO 3166-1 alpha-2, or `WORLD` for everywhere. */
const TERRITORY = /^(?:[A-Z]{2}|WORLD)$/

/**
 * Printing may be allowed only on rights that allow it: public domain, or a licence on record
 * (COMPLIANCE.md §8 — a reproduction of a work whose rights do not allow it cannot publish).
 */
export function rightsErrors(rights: Rights | null | undefined): Record<string, string> {
  const errors: Record<string, string> = {}
  const status = rights?.status ?? null
  if (rights?.printAllowed === true) {
    if (status === null || !(PRINTABLE_RIGHTS as readonly string[]).includes(status)) {
      errors.printAllowed =
        'Printing is allowed only for a work in the public domain or under a licence on record.'
    } else if (status === 'licensed' && !rights.licenceRef?.trim()) {
      errors.licenceRef = 'Give the licence’s reference before allowing prints under it.'
    }
  }
  if (status === 'licensed' && !rights?.holder?.trim()) {
    errors.holder = 'Name who holds the rights the licence is from.'
  }
  const bad = (rights?.territories ?? []).find((each) => !TERRITORY.test(each))
  if (bad !== undefined) {
    errors.territories = `"${bad}" is not a territory: use two-letter country codes (ID, NL) or WORLD.`
  }
  return errors
}

export type Cost = { readonly amount?: number | null; readonly currency?: string | null }

/**
 * An acquisition's cost, private (CONTENT-MODEL.md §1 `physical.acquisition`): C5 `Money` — a
 * safe integer of the currency's minor units (IDR has none here, `CURRENCY_EXPONENT`), never a
 * float — with its currency. It is no price: prices are a product's, set on the server (9.1).
 */
export function costErrors(cost: Cost | null | undefined): Record<string, string> {
  const errors: Record<string, string> = {}
  const amount = cost?.amount
  const currency = cost?.currency ?? null
  const hasAmount = amount !== null && amount !== undefined
  if (hasAmount && (!Number.isSafeInteger(amount) || amount < 0)) {
    errors.amount = 'A whole number of the currency’s smallest unit (cents, or rupiah), 0 or more.'
  }
  if (currency !== null && !(CURRENCY_CODES as readonly string[]).includes(currency)) {
    errors.currency = `One of ${CURRENCY_CODES.join(', ')}.`
  }
  if (hasAmount && currency === null) errors.currency = 'Say which currency the cost is in.'
  if (!hasAmount && currency !== null) errors.amount = 'Give the amount, or clear the currency.'
  return errors
}
