/**
 * The welcome code (TASKS.md 6.2.c, 6.2.d): matched case-insensitively, refused with a plain
 * bilingual message key when unknown, expired, not started, used up or already used by this buyer.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

import {
  DISCOUNT_MESSAGE_KEYS,
  applyDiscount,
  checkWelcomeCode,
  normaliseDiscountCode,
  type DiscountContact,
  type DiscountRecord,
} from './discount'
import { NOW, fixed, percent, welcomeRecord } from './pricing.test-support'

const BUYER: DiscountContact = { whatsapp: '+6281234567890', email: 'buyer@example.com' }

function check(
  enteredCode: unknown,
  welcome: DiscountRecord | null,
  contact: DiscountContact | null = BUYER,
  used = false,
) {
  const hasBeenUsedBy = vi.fn(() => Promise.resolve(used))
  return {
    result: checkWelcomeCode({ enteredCode, welcome, now: NOW, contact, hasBeenUsedBy }),
    hasBeenUsedBy,
  }
}

describe('a valid welcome code', () => {
  it('matches case-insensitively and trimmed', async () => {
    for (const typed of ['WELCOME10', 'welcome10', '  Welcome10 ']) {
      await expect(check(typed, welcomeRecord()).result).resolves.toEqual({
        ok: true,
        discount: {
          code: 'WELCOME10',
          kind: 'percent',
          value: 10,
          minSpendIdr: null,
          isBuyerChecked: true,
        },
      })
    }
  })

  it('is valid from startsAt (inclusive) until endsAt (exclusive)', async () => {
    await expect(
      check('welcome10', welcomeRecord({ startsAt: NOW })).result,
    ).resolves.toMatchObject({ ok: true })
    await expect(
      check('welcome10', welcomeRecord({ startsAt: null, endsAt: null })).result,
    ).resolves.toMatchObject({
      ok: true,
    })
  })

  it('without a contact (the bag page) is accepted pending the once-per-buyer check', async () => {
    const { result, hasBeenUsedBy } = check('welcome10', welcomeRecord(), null, true)
    await expect(result).resolves.toMatchObject({ ok: true, discount: { isBuyerChecked: false } })
    expect(hasBeenUsedBy).not.toHaveBeenCalled()
  })
})

describe('an expired or unknown code is refused with a plain message', () => {
  const refused = async (promise: Promise<unknown>, reason: string, messageKey: string) =>
    expect(promise).resolves.toEqual({ ok: false, refusal: { reason, messageKey } })

  it('refuses an unknown code, and any code when the site has no welcome discount', async () => {
    await refused(check('NOPE', welcomeRecord()).result, 'unknown', 'codeInvalid.unknown')
    await refused(check('WELCOME10', null).result, 'unknown', 'codeInvalid.unknown')
    for (const junk of ['', '   ', 'WEL COME', 'x'.repeat(33), 42, null, { code: 'WELCOME10' }]) {
      await refused(check(junk, welcomeRecord()).result, 'unknown', 'codeInvalid.unknown')
    }
  })

  it('refuses an expired code, including at the very instant it ends', async () => {
    await refused(
      check('welcome10', welcomeRecord({ endsAt: '2026-10-31T00:00:00Z' })).result,
      'expired',
      'codeInvalid.expired',
    )
    await refused(
      check('welcome10', welcomeRecord({ endsAt: NOW })).result,
      'expired',
      'codeInvalid.expired',
    )
  })

  it('refuses a code not started yet, one used up, and one this buyer already used', async () => {
    await refused(
      check('welcome10', welcomeRecord({ startsAt: '2026-12-01T00:00:00Z' })).result,
      'not_started',
      'codeInvalid.not-started',
    )
    await refused(
      check('welcome10', welcomeRecord({ usageLimit: 100, usedCount: 100 })).result,
      'usage_limit',
      'codeInvalid.usage-limit',
    )
    const { result, hasBeenUsedBy } = check('welcome10', welcomeRecord(), BUYER, true)
    await refused(result, 'already_used', 'codeInvalid.already-used')
    expect(hasBeenUsedBy).toHaveBeenCalledWith(BUYER, 'WELCOME10')
  })

  it('reads an inactive or misconfigured code as unknown, giving nothing away', async () => {
    await refused(
      check('welcome10', welcomeRecord({ active: false })).result,
      'inactive',
      'codeInvalid.unknown',
    )
    for (const bad of [
      { value: 150 },
      { value: 12.5 },
      { kind: 'fixed' as const, value: 0 },
      { endsAt: 'not a date' },
      { usedCount: -1 },
    ]) {
      await refused(
        check('welcome10', welcomeRecord(bad)).result,
        'invalid_record',
        'codeInvalid.unknown',
      )
    }
  })

  it('does not ask the database about a buyer when the code is not once-per-buyer', async () => {
    const { result, hasBeenUsedBy } = check(
      'welcome10',
      welcomeRecord({ oncePerBuyer: false }),
      BUYER,
      true,
    )
    await expect(result).resolves.toMatchObject({ ok: true })
    expect(hasBeenUsedBy).not.toHaveBeenCalled()
  })

  it('names keys the shop lexicon holds in both languages (already-used is still to be added)', () => {
    const lexicon = (lang: string) =>
      JSON.parse(
        readFileSync(
          fileURLToPath(
            new URL(`../../../../../apps/web/src/sites/shop/lexicon/${lang}.json`, import.meta.url),
          ),
          'utf8',
        ),
      ) as Record<string, string>
    const keys = new Set(Object.values(DISCOUNT_MESSAGE_KEYS))
    keys.delete('codeInvalid.already-used')
    for (const lang of ['en', 'id']) {
      const values = lexicon(lang)
      for (const k of keys) expect(values[k], `${lang}: ${k}`).toMatch(/\S/)
    }
  })
})

describe('applying a discount to the subtotal', () => {
  it('rounds a percentage half-up to the rupiah, once', () => {
    expect(applyDiscount(percent(10), 12_345)).toEqual({ ok: true, discountIdr: 1_235 }) // 1234.5
    expect(applyDiscount(percent(10), 12_344)).toEqual({ ok: true, discountIdr: 1_234 }) // 1234.4
    expect(applyDiscount(percent(15), 37_035)).toEqual({ ok: true, discountIdr: 5_555 }) // 5555.25
    expect(applyDiscount(percent(100), 95_000)).toEqual({ ok: true, discountIdr: 95_000 })
  })

  it('caps a fixed amount at the subtotal', () => {
    expect(applyDiscount(fixed(50_000), 600_000)).toEqual({ ok: true, discountIdr: 50_000 })
    expect(applyDiscount(fixed(200_000), 95_000)).toEqual({ ok: true, discountIdr: 95_000 })
  })

  it('refuses below the minimum spend with the rupiah still to add', () => {
    expect(applyDiscount(percent(10, 200_000), 150_000)).toEqual({
      ok: false,
      refusal: {
        reason: 'minimum_spend',
        messageKey: 'codeInvalid.minimum-spend',
        amountIdr: 50_000,
      },
    })
    expect(applyDiscount(percent(10, 200_000), 200_000)).toEqual({ ok: true, discountIdr: 20_000 })
  })

  it('normalises a typed code to its stored form', () => {
    expect(normaliseDiscountCode(' welcome-10 ')).toBe('WELCOME-10')
    expect(normaliseDiscountCode('-LEADING')).toBeNull()
  })
})
