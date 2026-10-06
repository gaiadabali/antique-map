/**
 * `whatsappLink` (TASKS.md 6.6.c): the admin's `wa.me` click-to-chat builder — a phone number in
 * any of the shapes staff type it (spaces, a leading `+`, dashes) and an optional prefilled
 * message, as the "Send price" panel's button uses it (`./quote-panel.jsx`).
 */
import { describe, expect, it } from 'vitest'

import { whatsappLink } from './data'

describe('whatsappLink', () => {
  it('strips spaces and a leading country-code +', () => {
    expect(whatsappLink('+62 812-3456-7890')).toBe('https://wa.me/6281234567890')
  })

  it('drops a local leading 0, as the buyer typed it, left as-is (digits only)', () => {
    expect(whatsappLink('0812 3456 7890')).toBe('https://wa.me/081234567890')
  })

  it('with no text, carries no `?text=`', () => {
    expect(whatsappLink('0812 3456 7890')).not.toContain('?text=')
  })

  it('with text, URL-encodes it onto `?text=`', () => {
    expect(whatsappLink('0812 3456 7890', 'Order #100059 — https://example.test/order/abc')).toBe(
      'https://wa.me/081234567890?text=Order%20%23100059%20%E2%80%94%20https%3A%2F%2Fexample.test%2Forder%2Fabc',
    )
  })

  it('an empty message string carries no `?text=` (never a bare `?text=`)', () => {
    expect(whatsappLink('0812 3456 7890', '')).toBe('https://wa.me/081234567890')
  })
})
