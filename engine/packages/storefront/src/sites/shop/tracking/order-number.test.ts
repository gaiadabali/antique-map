/**
 * The order number's thousands separator (6-followup): an order number is an identifier, never a
 * quantity — `tracking.title` and `tracking.whatsappMessage` must never group its digits, in
 * either locale.
 */
import { describe, expect, it } from 'vitest'

import { trackingText } from './copy'

describe('tracking order-number keys have no thousands separator', () => {
  it.each(['en', 'id'] as const)('%s', (locale) => {
    const t = trackingText(locale)
    const number = String(100001)
    for (const rendered of [
      t('tracking.title', { number }),
      t('tracking.whatsappMessage', { number }),
    ]) {
      expect(rendered).toContain('100001')
      expect(rendered).not.toContain('100,001')
    }
  })
})
