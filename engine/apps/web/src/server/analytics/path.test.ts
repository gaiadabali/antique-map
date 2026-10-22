import { describe, expect, it } from 'vitest'

import { normalisePath, redactQuery, referrerHost, utmOf } from './path'

describe('the normalised path (ANALYTICS.md §3)', () => {
  it('the path keeps utm_* and redacts q', () => {
    expect(
      normalisePath(
        'https://gallery.test/listing?type=maps&utm_source=newsletter&utm_medium=email&q=maps%20of%20java',
      ),
    ).toBe('/listing?utm_source=newsletter&utm_medium=email&q=maps%20of%20java')
    expect(normalisePath('https://gallery.test/search?q=sale@buyer.com&utm_campaign=launch')).toBe(
      '/search?q=%5Bremoved%5D&utm_campaign=launch',
    )
    expect(normalisePath('https://gallery.test/search?q=1234567890')).toBe(
      '/search?q=%5Bremoved%5D',
    )
    expect(normalisePath('https://shop.test/product/batik?fbclid=abc123&gclid=xyz')).toBe(
      '/product/batik',
    )
  })

  it('the tracking token is stripped from /track paths', () => {
    expect(normalisePath('https://shop.test/track/8f14e45fceea167a5a36dedd4bea2543')).toBe('/track')
    expect(normalisePath('https://shop.test/id/lacak/very-long-tracking-token-value')).toBe(
      '/id/lacak',
    )
    // Other paths keep their segments.
    expect(normalisePath('https://shop.test/product/batik-tulis')).toBe('/product/batik-tulis')
  })

  it('a URL that does not parse gives null, never a guess', () => {
    expect(normalisePath(null)).toBeNull()
    expect(normalisePath('')).toBeNull()
    expect(normalisePath('::::not-a-url')).toBeNull()
  })
})

describe('the redaction of §5', () => {
  it('an email, a phone number or a run of 6+ digits is replaced, then cut to 100', () => {
    expect(redactQuery('hello@buyer.com')).toBe('[removed]')
    expect(redactQuery('+62 812 3456 7890')).toBe('[removed]')
    expect(redactQuery('order 123456')).toBe('[removed]')
    expect(redactQuery('maps of java')).toBe('maps of java')
    const long = 'a'.repeat(300)
    expect(redactQuery(long)).toHaveLength(100)
  })
})

describe('referrerHost (§3)', () => {
  it('the host only, never the full URL', () => {
    expect(referrerHost('https://www.google.com/search?q=x')).toBe('www.google.com')
    expect(referrerHost('http://newsletter.example/path')).toBe('newsletter.example')
    expect(referrerHost(null)).toBeNull()
    expect(referrerHost('')).toBeNull()
    expect(referrerHost('not a url')).toBeNull()
  })
})

describe('utmOf (§3)', () => {
  it('the trio from a landing URL or an envelope, lower cased and cut', () => {
    expect(
      utmOf('https://shop.test/?utm_source=Instagram&utm_medium=cpc&utm_campaign=lebaran'),
    ).toEqual({ source: 'instagram', medium: 'cpc', campaign: 'lebaran' })
    expect(utmOf({ utm_source: 'newsletter', utm_medium: 'email' })).toEqual({
      source: 'newsletter',
      medium: 'email',
      campaign: null,
    })
    expect(utmOf(null)).toEqual({ source: null, medium: null, campaign: null })
    expect(utmOf({})).toEqual({ source: null, medium: null, campaign: null })
  })
})
