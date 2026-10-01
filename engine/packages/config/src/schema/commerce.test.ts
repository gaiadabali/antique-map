// C1 v1.5 (TASKS.md 6.4.a, D50): a unique item's price published or always on request, the
// bag behind a module, and a call among the purchase actions. The gallery sells by conversation
// and invoice; the engine keeps every capability another brand's config may turn on.
import { describe, expect, it } from 'vitest'

import { testBrandConfig } from '../validate/testing/fixtures'
import {
  brandConfigSchema,
  hasModule,
  MODULE_KEYS,
  PURCHASE_ACTIONS,
  UNIQUE_PRICES,
} from '../schema'

/* eslint-disable @typescript-eslint/no-explicit-any -- each case reaches into raw JSON */
type Raw = any
const parse = (mutate: (raw: Raw) => void) => {
  const raw: Raw = testBrandConfig('gallery')
  mutate(raw)
  return brandConfigSchema.safeParse(raw)
}
const issues = (result: ReturnType<typeof parse>) =>
  result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))

/** The gallery's launch tier (COMMERCE.md §7): the conversation leads, every original alike. */
const CONVERSATION = {
  upTo: null,
  primary: 'whatsapp',
  secondary: ['call', 'requestPrice', 'enquire', 'viewing', 'proforma'],
}

describe('C1 v1.5 — commerce.uniquePrices', () => {
  it('defaults to "shown", so a config that never names it keeps its prices published', () => {
    const result = parse(() => {})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.commerce.uniquePrices).toBe('shown')
  })

  it('takes "on-request" with a tier the conversation leads', () => {
    const result = parse((raw) => {
      raw.commerce.uniquePrices = 'on-request'
      raw.commerce.purchaseTiers = [CONVERSATION]
    })
    expect(issues(result)).toEqual([])
    expect(UNIQUE_PRICES).toEqual(['shown', 'on-request'])
  })

  it('refuses Buy beside prices on request — as a primary or a secondary — naming each place', () => {
    const result = parse((raw) => {
      raw.commerce.uniquePrices = 'on-request'
      raw.commerce.purchaseTiers = [
        { upTo: 500000, primary: 'buy', secondary: ['enquire'] },
        { upTo: null, primary: 'whatsapp', secondary: ['enquire', 'buy'] },
      ]
    })
    expect(issues(result)).toEqual([
      'commerce.purchaseTiers.0.primary',
      'commerce.purchaseTiers.1.secondary.1',
    ])
  })

  it('leaves Buy alone while prices are shown', () => {
    const result = parse((raw) => {
      raw.commerce.uniquePrices = 'shown'
      raw.commerce.purchaseTiers = [{ upTo: null, primary: 'buy', secondary: ['call'] }]
    })
    expect(issues(result)).toEqual([])
  })

  it('refuses a value it does not know', () => {
    expect(issues(parse((raw) => (raw.commerce.uniquePrices = 'hidden')))).toEqual([
      'commerce.uniquePrices',
    ])
  })
})

describe('C1 v1.5 — the bag is a module, a call is an action', () => {
  it('declares purchase.checkout, off unless a brand turns it on', () => {
    expect(MODULE_KEYS).toContain('purchase.checkout')
    expect(hasModule({ modules: {} }, 'purchase.checkout')).toBe(false)
    expect(hasModule({ modules: { 'purchase.checkout': true } }, 'purchase.checkout')).toBe(true)
  })

  it('offers call among the purchase actions, and keeps every earlier one', () => {
    expect(PURCHASE_ACTIONS).toContain('call')
    for (const kept of ['buy', 'reserve', 'offer', 'enquire', 'whatsapp', 'requestPrice']) {
      expect(PURCHASE_ACTIONS).toContain(kept)
    }
  })
})

describe('C1 v1.5 — the invoice term (D45, the owner, 2026-10-01)', () => {
  it('proposes a due date three days out and reminds the buyer a day before it', () => {
    const result = parse(() => {})
    expect(result.success).toBe(true)
    if (!result.success) return
    const { invoiceHoldDays, invoiceNoticeHours } = result.data.commerce.ttl
    expect(invoiceHoldDays).toBe(3)
    expect(invoiceNoticeHours).toBe(24)
    // The reminder leaves the term room to be paid in (C1's header rule, PLT's to enforce).
    expect(invoiceNoticeHours).toBeLessThan(invoiceHoldDays * 24)
  })
})
