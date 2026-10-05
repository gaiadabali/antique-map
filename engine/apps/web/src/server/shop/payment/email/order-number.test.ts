/**
 * The order number's thousands separator (6-followup): an order number is an identifier, never a
 * quantity — `email.subject` and `email.body` must never group its digits, in either locale.
 */
import { describe, expect, it } from 'vitest'

import { emailText } from './copy'

describe('email order-number keys have no thousands separator', () => {
  it.each(['en', 'id'] as const)('%s', (locale) => {
    const t = emailText(locale)
    const number = String(100001)
    for (const rendered of [t('email.subject', { number }), t('email.body', { number })]) {
      expect(rendered).toContain('100001')
      expect(rendered).not.toContain('100,001')
    }
  })
})
