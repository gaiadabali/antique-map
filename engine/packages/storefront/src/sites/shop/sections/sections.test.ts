/**
 * The owner's feedback of 2026-11-19 (TASKS.md 28.2), the pure parts: the landing page's order, the
 * shop page's narrowed addresses, when the same-day promise still holds today, and the contact
 * strip's lines.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { ShopBlockVM } from '../../../server/shop/pages/blocks'
import { homeOrder } from './home-order'
import { shopFilterHref, shopFilterOf } from './links'
import { sameDayOpen } from './promo'
import { contactLinesOf } from '../shell/contact-strip'

const block = (type: ShopBlockVM['type'], id = type) => ({ type, id }) as unknown as ShopBlockVM
const order = (blocks: readonly ShopBlockVM[]) =>
  homeOrder(blocks).map((item) => (item.kind === 'block' ? item.block.id : item.kind))

describe('the landing page’s order', () => {
  it('is hero, promise, Shop by, Wall Decor, How We Make Them, articles, Partnerships, Stores, Antiques', () => {
    const seeded = ['homeHero', 'categoryRail', 'steps', 'story', 'originals'] as const
    expect(order(seeded.map((type) => block(type)))).toEqual([
      'homeHero',
      'promo',
      'categoryRail',
      'wallDecor',
      'steps',
      'articles',
      'story',
      'stores',
      'originals',
    ])
  })

  it('keeps an older home’s extra rail and ends with the Antiques wherever the editor put them', () => {
    const older = ['homeHero', 'originals', 'categoryRail', 'productRail', 'steps', 'story']
    expect(order(older.map((type) => block(type as ShopBlockVM['type'])))).toEqual([
      'homeHero',
      'promo',
      'categoryRail',
      'wallDecor',
      'productRail',
      'steps',
      'articles',
      'story',
      'stores',
      'originals',
    ])
  })

  it('places every built-in section even on a home of one block', () => {
    expect(order([block('homeHero')])).toEqual([
      'homeHero',
      'promo',
      'wallDecor',
      'articles',
      'stores',
    ])
  })
})

describe('the shop page’s narrowed addresses', () => {
  it('reads a theme or a set back from the query, and nothing else', () => {
    expect(shopFilterOf({ subject: 'bali' })).toEqual({ kind: 'theme', slug: 'bali' })
    expect(shopFilterOf({ productType: 'wall-decor' })).toEqual({ kind: 'set', set: 'wall-decor' })
    expect(shopFilterOf({ productType: 'everything' })).toBeNull()
    expect(shopFilterOf({ subject: '../admin' })).toBeNull()
    expect(shopFilterOf({})).toBeNull()
  })

  it('is the shop listing with the one parameter, in each language', () => {
    expect(shopFilterHref({ kind: 'theme', slug: 'java' }, 'en')).toBe('/shop?subject=java')
    expect(shopFilterHref({ kind: 'set', set: 'best-sellers' }, 'id')).toBe(
      '/id/belanja?productType=best-sellers',
    )
  })
})

describe('the same-day promise', () => {
  const rule = { cutoff: '15:30', timeZone: 'Asia/Makassar', weekdaysOnly: true }
  // Asia/Makassar is UTC+8.
  it('holds on a weekday before the cut-off, Bali time', () => {
    expect(sameDayOpen(new Date('2026-11-19T07:29:00Z'), rule)).toBe(true) // Thu 15:29
    expect(sameDayOpen(new Date('2026-11-19T07:30:00Z'), rule)).toBe(false) // Thu 15:30
  })

  it('does not hold at the weekend unless the owner says so', () => {
    const saturday = new Date('2026-11-21T02:00:00Z') // Sat 10:00
    expect(sameDayOpen(saturday, rule)).toBe(false)
    expect(sameDayOpen(saturday, { ...rule, weekdaysOnly: false })).toBe(true)
  })
})

describe('the contact strip’s lines', () => {
  it('are phone, WhatsApp and email, in that order, and no address', () => {
    const contact = { whatsapp: '+6281299253712', email: 'hello@example.test', phone: '0361 123' }
    expect(contactLinesOf(contact, 'en').map((line) => line.key)).toEqual([
      'phone',
      'whatsapp',
      'email',
    ])
    expect(contactLinesOf({ whatsapp: null, email: null, phone: null }, 'en')).toEqual([])
  })
})
