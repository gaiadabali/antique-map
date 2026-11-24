/**
 * The inbox's tabs and search (TASKS.md 27.3.a) and the order page's WhatsApp messages (27.3.b),
 * pure. The scoping to a store user's own orders is the collection's access, tested on a real
 * database in `./order-door.db.test.ts`.
 */
import { describe, expect, it } from 'vitest'

import { ORDER_STATUSES } from '../../collections/orders/statuses'
import { INBOX_TABS, TAB_STATUSES, searchWhere, tabForStatus, tabOf, tabWhere } from './inbox'
import { buyerMessage, storeMessage, waLink } from './wa'

describe('the inbox tabs', () => {
  it('every status sits in exactly one tab', () => {
    for (const status of ORDER_STATUSES) {
      const tabs = INBOX_TABS.filter((tab) => TAB_STATUSES[tab].includes(status))
      expect(tabs, status).toHaveLength(1)
      expect(tabForStatus(status)).toBe(tabs[0])
    }
  })

  it('an unknown tab in the address is "Needs action"', () => {
    expect(tabOf('on_the_way')).toBe('on_the_way')
    expect(tabOf('drop table')).toBe('needs_action')
    expect(tabOf(undefined)).toBe('needs_action')
  })

  it('"Needs action" also holds a flagged order, whatever its status', () => {
    expect(tabWhere('needs_action', null, null)).toEqual({
      and: [
        {
          or: [
            { status: { in: ['awaiting_quote', 'pending_payment', 'paid'] } },
            { 'needsAttention.flag': { equals: true } },
          ],
        },
      ],
    })
    expect(tabWhere('closed', null, 4)).toEqual({
      and: [{ status: { in: ['cancelled', 'expired'] } }, { store: { equals: 4 } }],
    })
  })
})

describe('the search', () => {
  it('empty is no search', () => {
    expect(searchWhere('   ')).toBeNull()
    expect(searchWhere(undefined)).toBeNull()
  })

  it('a name searches the buyer’s name only', () => {
    expect(searchWhere(' Made ')).toEqual({ or: [{ 'contact.name': { like: 'Made' } }] })
  })

  it('a number is the order number, exactly, with or without #', () => {
    expect(searchWhere('#100042')).toEqual({
      or: [
        { 'contact.name': { like: '#100042' } },
        { number: { equals: 100042 } },
        { 'contact.whatsapp': { like: '100042' } },
      ],
    })
  })

  it('a phone typed with spaces or a leading 0 finds the stored +62 number', () => {
    expect(searchWhere('0812 3456')).toEqual({
      or: [
        { 'contact.name': { like: '0812 3456' } },
        { 'contact.whatsapp': { like: '08123456' } },
        { 'contact.whatsapp': { like: '628123456' } },
      ],
    })
  })
})

describe('the WhatsApp buttons', () => {
  it('a wa.me link with the message encoded; no link for a number too short to dial', () => {
    expect(waLink('+62 812-3456-7890', 'Hi & bye')).toBe(
      'https://wa.me/6281234567890?text=Hi%20%26%20bye',
    )
    expect(waLink('0812 3456 7890', 'x')).toBe('https://wa.me/6281234567890?text=x')
    expect(waLink('123', 'x')).toBeNull()
    expect(waLink(null, 'x')).toBeNull()
  })

  it('the buyer’s message is in their language, with the pay link only before payment', () => {
    const base = { name: 'Made', number: 100042, payLink: 'https://shop.test/order/t' }
    expect(buyerMessage({ ...base, locale: 'id', status: 'pending_payment' })).toBe(
      'Halo Made, kami dari Old East Indies tentang pesanan Anda #100042. Pesanan Anda siap dibayar di sini: https://shop.test/order/t',
    )
    expect(buyerMessage({ ...base, locale: 'en', status: 'on_the_way' })).toBe(
      'Hello Made, this is Old East Indies about your order #100042. Your order is on the way to you.',
    )
  })

  it('the store’s message names the order, its items and the drop-off', () => {
    expect(
      storeMessage({
        language: 'en',
        number: 100042,
        lines: [
          { qty: 2, name: 'Tote' },
          { qty: 1, name: 'Print' },
        ],
        area: 'Villa Kecil, Ubud',
      }),
    ).toBe('Order #100042: 2× Tote, 1× Print. Drop-off: Villa Kecil, Ubud.')
  })
})
