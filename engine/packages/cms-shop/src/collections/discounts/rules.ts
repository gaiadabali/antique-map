/**
 * A discount's save rules (CONTENT-MODEL.md §8; COMMERCE.md §5), with plain reasons: a percent is
 * a whole 1–100 and a fixed amount whole rupiah above zero; the window ends after it starts; a use
 * limit is a whole number of at least one and not below the uses already counted. The database
 * holds the same (`./constraints`).
 */
import type { Validate } from 'payload'

import { isWhole } from '../products/money'

type DiscountSiblings = {
  kind?: unknown
  startsAt?: unknown
  usedCount?: unknown
}

export const validatePercent: Validate<number | null | undefined> = (value, { siblingData }) => {
  // Replaces Payload's own validator, so the field's `required` is checked here.
  if (value === null || value === undefined) return 'Set how much the code takes off.'
  const kind = (siblingData as DiscountSiblings | undefined)?.kind
  if (kind === 'percent') {
    return isWhole(value, 1) && value <= 100 ? true : 'A percent code takes off 1 to 100 percent.'
  }
  return isWhole(value, 1)
    ? true
    : 'A rupiah code takes off a whole number of rupiah above zero, such as 50000.'
}

const time = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const ms = new Date(value as string).getTime()
  return Number.isNaN(ms) ? null : ms
}

export const validateEndsAt: Validate<unknown> = (value, { siblingData }) => {
  const ends = time(value)
  const starts = time((siblingData as DiscountSiblings | undefined)?.startsAt)
  return ends !== null && starts !== null && ends <= starts
    ? 'The code must end after it starts.'
    : true
}

export const validateUsageLimit: Validate<number | null | undefined> = (value, { siblingData }) => {
  if (value === null || value === undefined) return true
  if (!isWhole(value, 1))
    return 'Uses allowed is a whole number, 1 or more — or empty for no limit.'
  const used = (siblingData as DiscountSiblings | undefined)?.usedCount
  return typeof used === 'number' && value < used
    ? `This code has already been used ${used} times: allow at least that many.`
    : true
}
