/**
 * The checkout's words (6.3.a): this module's keys and every lexicon key the checkout borrows
 * exist in both locales — an `en`-only key would show an Indonesian buyer English defaults.
 */
import { describe, expect, it } from 'vitest'

import en from '../lexicon/en.json'
import id from '../lexicon/id.json'

import { CHECKOUT_KEYS } from './copy'

const SHARED_KEYS = [
  'checkout.address',
  'checkout.email',
  'checkout.fullName',
  'checkout.fullNameHint',
  'checkout.continueToPayment',
  'checkout.whatsapp',
  'checkout.whatsappHint',
  'checkout.problem.price-changed',
  'checkout.problem.not-found',
  'checkout.mapPin',
  'cart.empty',
  'cart.title',
  'cart.quantity',
  'cart.remove',
  'cart.checkout',
  'bag.beyondReach',
  'bag.deliveryUnavailable',
  'codeInvalid.unknown',
  'codeInvalid.expired',
  'codeInvalid.usage-limit',
  'codeInvalid.already-used',
  'codeInvalid.minimum-spend',
  'action.whatsapp',
] as const

describe('checkout lexicon', () => {
  it('every key this page defines is in both locales', () => {
    for (const key of Object.keys(CHECKOUT_KEYS)) {
      expect(en, `en missing ${key}`).toHaveProperty(key)
      expect(id, `id missing ${key}`).toHaveProperty(key)
    }
  })

  it('every lexicon key the checkout borrows is in both locales', () => {
    for (const key of SHARED_KEYS) {
      expect(en, `en missing ${key}`).toHaveProperty(key)
      expect(id, `id missing ${key}`).toHaveProperty(key)
    }
  })

  it('the named-lines refusals keep their {items} placeholder', () => {
    expect(en['checkout.problem.out-of-stock']).toContain('{items}')
    expect(id['checkout.problem.out-of-stock']).toContain('{items}')
    expect(en['checkout.problem.no-single-store']).toContain('{items}')
    expect(id['checkout.problem.no-single-store']).toContain('{items}')
    expect(en['checkout.sendingFrom']).toContain('{area}')
    expect(id['checkout.sendingFrom']).toContain('{area}')
  })
})
