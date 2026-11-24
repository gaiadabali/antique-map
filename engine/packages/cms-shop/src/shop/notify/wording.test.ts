/**
 * The emails' wording from the owner's settings (TASKS.md 27.3.d): the owner's subject and opening
 * per locale, the default where a field is empty, `{number}` and `{store}` filled, and the owner's
 * text escaped in the HTML part — never markup, never a link.
 */
import { describe, expect, it } from 'vitest'

import { ORDER_EMAILS } from '../../globals/site-settings/shop/notification-copy'
import { buyerStatusEmail, orderReceivedEmail } from './templates'
import { storeNewOrderEmail } from './store-templates'
import { fill, wordingFor } from './wording'

const vars = { number: 100042, store: 'Ubud' }

describe('wordingFor', () => {
  it('the defaults, filled, when the owner wrote nothing', () => {
    expect(wordingFor({}, 'paid', 'en', vars)).toEqual({
      subject: 'Order #100042 — update',
      opening: ORDER_EMAILS.paid.opening.en,
    })
    expect(wordingFor({}, 'storeNewOrder', 'id', vars).subject).toBe('Pesanan baru #100042 — Ubud')
  })

  it('the owner’s own words, per locale, with the placeholders filled', () => {
    const stored = {
      paid: { subject: 'Terima kasih! #{number}', opening: '  Dikirim dari {store}.  ' },
    }
    expect(wordingFor(stored, 'paid', 'id', vars)).toEqual({
      subject: 'Terima kasih! #100042',
      opening: 'Dikirim dari Ubud.',
    })
  })

  it('an empty or blank field falls back to the default, field by field', () => {
    const stored = { delivered: { subject: '   ', opening: null } }
    expect(wordingFor(stored, 'delivered', 'en', vars)).toEqual({
      subject: 'Order #100042 — update',
      opening: ORDER_EMAILS.delivered.opening.en,
    })
  })

  it('fill touches only the two placeholders', () => {
    expect(fill('{number} {store} {other} {{number}}', vars)).toBe('100042 Ubud {other} {100042}')
  })
})

describe('the templates with the owner’s wording', () => {
  it('a status email takes the subject and opening, and escapes them in HTML', () => {
    const email = buyerStatusEmail({
      to: 'b@example.test',
      locale: 'en',
      orderNumber: 1,
      status: 'paid',
      trackingUrl: 'https://shop.example.test/track/abc',
      wording: { subject: 'Paid <b>!</b>', opening: 'See <a href="https://evil.test">this</a>' },
    })!
    expect(email.subject).toBe('Paid <b>!</b>')
    expect(email.text).toContain('See <a href="https://evil.test">this</a>')
    expect(email.html).not.toContain('<a href="https://evil.test">')
    expect(email.html).toContain('&lt;a href=&quot;https://evil.test&quot;&gt;')
    expect(email.html).toContain(
      '<a href="https://shop.example.test/track/abc">https://shop.example.test/track/abc</a>',
    )
  })

  it('pending_payment has no status email (its emails are the priced ones)', () => {
    expect(
      buyerStatusEmail({
        to: 'b@example.test',
        locale: 'en',
        orderNumber: 1,
        status: 'pending_payment',
        trackingUrl: 'https://x.test',
      }),
    ).toBeNull()
  })

  it('order received: the default subject, the three figures and the pay link', () => {
    const email = orderReceivedEmail({
      to: 'b@example.test',
      locale: 'id',
      orderNumber: 100042,
      itemsTotalIdr: 95_000,
      deliveryFeeIdr: 0,
      totalIdr: 95_000,
      payBy: null,
      payUrl: 'https://shop.example.test/id/order/abc',
    })
    expect(email.subject).toBe('Pesanan #100042 — siap dibayar')
    expect(email.text).toContain(ORDER_EMAILS.orderReceived.opening.id)
    expect(email.text).toContain('Pengiriman: gratis')
    expect(email.text).toContain('Bayar di sini: https://shop.example.test/id/order/abc')
  })

  it('a store email sends both openings and the English subject', () => {
    const email = storeNewOrderEmail({
      to: 's@example.test',
      orderNumber: 100042,
      storeName: 'Ubud',
      itemSummary: '1× Tote',
      totalIdr: 110_000,
      adminUrl: 'https://admin.example.test/admin/orders/7',
    })
    expect(email.subject).toBe('New order #100042 — Ubud')
    expect(email.text.split('\n').slice(0, 2)).toEqual([
      'New paid order #100042 for Ubud',
      'Pesanan #100042 yang sudah dibayar untuk Ubud',
    ])
  })
})
