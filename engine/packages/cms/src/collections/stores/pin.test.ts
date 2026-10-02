/**
 * A store's pin, address and WhatsApp rules, and the deletion guard's words, without a database
 * (CONTENT-MODEL.md §8; TASKS.md 3.3.b, 3.3.d). The database proofs are `./stores.db.test.ts`.
 */
import { describe, expect, it } from 'vitest'

import { INDONESIA_BOUNDS, validateAddress, validateCoordinate, validateWhatsApp } from './pin'
import { stillUsedMessage } from './still-used'

const on = (siblingData: Record<string, unknown>) => ({ siblingData }) as never

describe('a store’s pin', () => {
  const lat = validateCoordinate('lat')
  const lng = validateCoordinate('lng')

  it('takes Ubud, and the corners of the box', () => {
    expect(lat(-8.5069, on({}))).toBe(true)
    expect(lng(115.2625, on({}))).toBe(true)
    expect(lat(INDONESIA_BOUNDS.lat.min, on({}))).toBe(true)
    expect(lng(INDONESIA_BOUNDS.lng.max, on({}))).toBe(true)
  })

  it('refuses a coordinate outside Indonesia, as a swapped pair would be', () => {
    expect(lat(115.26, on({}))).toMatch(/latitude is outside Indonesia/)
    expect(lng(-8.5, on({}))).toMatch(/longitude is outside Indonesia/)
    expect(lat(Number.NaN, on({}))).toMatch(/is a number/)
  })

  it('may be empty on an inactive store, never on an active one', () => {
    expect(lat(null, on({ active: false }))).toBe(true)
    expect(lng(undefined, on({}))).toBe(true)
    expect(lat(null, on({ active: true }))).toMatch(/active store needs its latitude/)
    expect(validateAddress('  ', on({ active: true }))).toMatch(/needs its address/)
    expect(validateAddress('', on({ active: false }))).toBe(true)
    expect(validateAddress('Jl. Raya Ubud 1', on({ active: true }))).toBe(true)
  })
})

describe('a store’s WhatsApp', () => {
  it('is E.164 or nothing', () => {
    expect(validateWhatsApp('+6281234567890', on({}))).toBe(true)
    expect(validateWhatsApp('', on({}))).toBe(true)
    for (const bad of ['081234567890', '+62 812 3456 7890', '+0812345678']) {
      expect(validateWhatsApp(bad, on({})), bad).toMatch(/international form/)
    }
  })
})

describe('the refusal to delete a store in use', () => {
  it('names what still points at it, and only that', () => {
    expect(stillUsedMessage([{ count: 2, noun: 'staff accounts' }])).toMatch(
      /^This store still has 2 staff accounts\. .*switch Active off/,
    )
    expect(
      stillUsedMessage([
        { count: 1, noun: 'staff account' },
        { count: 0, noun: 'stock rows' },
        { count: 3, noun: 'orders' },
      ]),
    ).toMatch(/^This store still has 1 staff account and 3 orders\./)
    expect(
      stillUsedMessage([
        { count: 1, noun: 'staff account' },
        { count: 4, noun: 'stock rows' },
        { count: 3, noun: 'orders' },
      ]),
    ).toMatch(/^This store still has 1 staff account, 4 stock rows and 3 orders\./)
  })
})
