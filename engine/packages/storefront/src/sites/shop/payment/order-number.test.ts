/**
 * The order number's thousands separator (6-followup): an order number is an identifier, never a
 * quantity — `order.title` must never group its digits, in either locale.
 */
import { describe, expect, it } from 'vitest'

import { paymentText } from './copy'

describe('order.title has no thousands separator', () => {
  it.each(['en', 'id'] as const)('%s', (locale) => {
    const t = paymentText(locale)
    expect(t('order.title', { number: String(100001) })).toContain('100001')
    expect(t('order.title', { number: String(100001) })).not.toContain('100,001')
  })
})
