import { describe, expect, it } from 'vitest'

import { CATALOGUE_NAMES, validateEvent } from './catalogue'

const name = (n: string) => ({
  name: n,
  at: null,
  locale: 'en',
  props: {},
  url: null,
  referrer: null,
  utm: {},
  surface: null,
})

describe('the event catalogue (ANALYTICS.md §4)', () => {
  it('every §4 name is in the catalogue', () => {
    expect(CATALOGUE_NAMES).toHaveLength(24)
    expect(CATALOGUE_NAMES).toContain('page.viewed')
    expect(CATALOGUE_NAMES).toContain('vitals.reported')
    expect(CATALOGUE_NAMES).toContain('order.paid')
  })

  it('an unknown event name is dropped', () => {
    expect(validateEvent(name('page.clicked'), 'gallery')).toBeNull()
    expect(validateEvent(name('item.viewed '), 'gallery')).toBeNull()
    expect(validateEvent(name(''), 'gallery')).toBeNull()
  })

  it('a site an event does not belong to drops it', () => {
    expect(validateEvent(name('item.viewed'), 'shop')).toBeNull()
    expect(validateEvent(name('product.viewed'), 'gallery')).toBeNull()
    expect(
      validateEvent({ ...name('page.viewed'), props: { pageType: 'home' } }, 'shop'),
    ).not.toBeNull()
  })

  it('a prop outside its schema drops the event', () => {
    expect(
      validateEvent({ ...name('page.viewed'), props: { pageType: 'newsletter' } }, 'gallery'),
    ).toBeNull()
    expect(
      validateEvent({ ...name('page.viewed'), props: { pageType: 'home', extra: 1 } }, 'gallery'),
    ).toBeNull()
    expect(validateEvent({ ...name('page.viewed'), props: { pageType: 3 } }, 'gallery')).toBeNull()
    // A required prop missing also drops.
    expect(validateEvent({ ...name('page.viewed'), props: {} }, 'gallery')).toBeNull()
    // An optional prop may be left out (ask.clicked's workId/productId).
    expect(
      validateEvent(
        { ...name('ask.clicked'), props: { channel: 'whatsapp', context: 'footer' } },
        'gallery',
      ),
    ).not.toBeNull()
  })

  it('an impossible value drops the event: negative counts, LCP over 60 s', () => {
    expect(
      validateEvent(
        {
          ...name('search.submitted'),
          props: { query: 'maps', resultCount: -1, zeroResults: true },
        },
        'gallery',
      ),
    ).toBeNull()
    expect(
      validateEvent(
        { ...name('vitals.reported'), props: { pageType: 'home', lcp: 60_001, inp: 10, cls: 0 } },
        'gallery',
      ),
    ).toBeNull()
    expect(
      validateEvent(
        { ...name('vitals.reported'), props: { pageType: 'home', lcp: 60_000, inp: 10, cls: 1 } },
        'gallery',
      ),
    ).not.toBeNull()
    expect(
      validateEvent(
        { ...name('cart.added'), props: { productId: 1, variantSku: 'A-1', qty: 0, value: 0 } },
        'shop',
      ),
    ).toBeNull()
  })

  it('a search query is re-redacted before storage, whatever the sender claims', () => {
    const valid = validateEvent(
      {
        ...name('search.submitted'),
        props: { query: 'contact me at buyer@example.com', resultCount: 0, zeroResults: true },
      },
      'gallery',
    )
    expect(valid?.props.query).toBe('[removed]')
  })

  it('props over 2 KB drop the event (§7)', () => {
    expect(
      validateEvent(
        {
          ...name('search.submitted'),
          props: { query: 'a'.repeat(100), resultCount: 0, zeroResults: true },
        },
        'gallery',
      ),
    ).not.toBeNull()
    expect(
      validateEvent(
        {
          ...name('listing.viewed'),
          props: {
            listing: 'all',
            resultCount: 0,
            facets: [{ key: 'k'.repeat(60), value: 'v'.repeat(120) }],
          },
        },
        'gallery',
      ),
    ).not.toBeNull()
  })
})
