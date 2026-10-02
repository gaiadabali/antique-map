/**
 * The last line of the tools' projections (TASKS.md 8.1.b; AI.md §3.1 "there is nothing to
 * leak"). Every tool result is built field by field from an allow-list (`./works`, `./products`,
 * `./stores`), from a Payload read that `select`s only those fields. This guard runs on the
 * finished result anyway and **throws** when a key on the forbidden list appears at any depth —
 * so a mapper bug, or a field 3.2 or 3.3 adds under a familiar name, fails the tool call (the
 * model is told the tool is unavailable) instead of reaching the model.
 *
 * - On both sites: staff-only and personal fields — `askingPrice`, `notes`, `aiDraft`, `legacy`,
 *   `physical`, `acquisition`, `cataloguing`, `rights`, contact details, stock quantities, other
 *   visitors' records — and any bare `price`, `amount`, `cost` or `currency`.
 * - On the gallery: any key that so much as mentions a price, an amount, a cost, a currency or a
 *   value. An antique has no price the chat may see (DR-3, G4).
 * - On the shop: a price travels only as a server-formatted label (`priceLabel`, `feeLabel`,
 *   `freeOverLabel`), never as a number the model could re-total.
 */
import 'server-only'

import type { SiteKey } from '../types'

/** Keys no tool result may contain, on either site (compared case-insensitively). */
export const FORBIDDEN_KEYS = [
  'price',
  'prices',
  'askingPrice',
  'asking_price',
  'amount',
  'cost',
  'currency',
  'notes',
  'internalNotes',
  'aiDraft',
  'legacy',
  'physical',
  'acquisition',
  'consignor',
  'exportStatus',
  'coaIssued',
  'cataloguing',
  'rights',
  'provenance',
  'workUid',
  'master',
  'quantity',
  'stockLevels',
  'whatsapp',
  'email',
  'phone',
  'contact',
  'payload',
  'transcript',
  'ipHash',
  'lead',
  'leads',
  'chatSession',
  'orders',
  'user',
  'users',
  'password',
  'createdBy',
  'updatedBy',
  '_status',
  'lat',
  'lng',
] as const

/** Gallery: any key mentioning money or value. */
const GALLERY_MONEY_KEY = /price|amount|cost|currency|value|valuation|insur/i
/** Shop: money only as these server-formatted labels. */
const SHOP_LABEL_KEYS = new Set(['priceLabel', 'feeLabel', 'freeOverLabel'])
const SHOP_MONEY_KEY = /price|amount|cost|currency/i

const FORBIDDEN = new Set(FORBIDDEN_KEYS.map((key) => key.toLowerCase()))

export class ProjectionViolation extends Error {
  override readonly name = 'ProjectionViolation'
  constructor(readonly path: string) {
    // The path names the key, never its value.
    super(`a tool result carried a forbidden key at ${path}`)
  }
}

function isForbidden(key: string, site: SiteKey): boolean {
  if (FORBIDDEN.has(key.toLowerCase())) return true
  if (site === 'gallery') return GALLERY_MONEY_KEY.test(key)
  return SHOP_MONEY_KEY.test(key) && !SHOP_LABEL_KEYS.has(key)
}

/** Throws `ProjectionViolation` when `value` holds a forbidden key at any depth. */
export function assertPublicProjection<T>(value: T, site: SiteKey, path = '$'): T {
  if (Array.isArray(value)) {
    value.forEach((each, index) => assertPublicProjection(each, site, `${path}[${index}]`))
  } else if (value !== null && typeof value === 'object') {
    for (const [key, each] of Object.entries(value)) {
      if (isForbidden(key, site)) throw new ProjectionViolation(`${path}.${key}`)
      assertPublicProjection(each, site, `${path}.${key}`)
    }
  }
  return value
}
