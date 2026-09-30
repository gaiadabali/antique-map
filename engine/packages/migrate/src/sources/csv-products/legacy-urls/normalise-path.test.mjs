import { URLSearchParams } from 'node:url'

import { describe, expect, it } from 'vitest'

import { hostLabel, keptQuery, normalisePathname, normaliseUrl } from './normalise-path.mjs'

const DOMAIN = 'example-shop.test'

/** @param {string} raw */
function key(raw) {
  const result = normaliseUrl(raw, DOMAIN)
  if (!result.ok) throw new Error(`rejected: ${result.reason}`)
  return `${result.host} ${result.key}`
}

describe('normaliseUrl', () => {
  it('strips scheme, host, www and port — every spelling of the home page is one key', () => {
    for (const raw of [
      'http://example-shop.test',
      'https://example-shop.test/',
      'https://www.example-shop.test/',
      'http://WWW.Example-Shop.test:80/',
      'www.example-shop.test',
    ]) {
      expect(key(raw)).toBe('@ /')
    }
  })

  it('drops the trailing slash and collapses doubled slashes, keeping case and encoding', () => {
    expect(key('https://www.example-shop.test/about/')).toBe('@ /about')
    expect(key('https://www.example-shop.test//shop//p/x/')).toBe('@ /shop/p/x')
    expect(key('https://www.example-shop.test/Shop/p/Caf%C3%A9')).toBe('@ /Shop/p/Caf%C3%A9')
  })

  it('drops query noise and fragments but keeps category and tag filters', () => {
    expect(key('https://www.example-shop.test/shop/p/x?format=json')).toBe('@ /shop/p/x')
    expect(key('https://www.example-shop.test/blog?offset=1600000000000&format=rss')).toBe(
      '@ /blog',
    )
    expect(key('https://www.example-shop.test/cart?cartToken=abc&utm_source=x#top')).toBe('@ /cart')
    expect(key('https://www.example-shop.test/shop?tag=bali&category=Maps&format=json')).toBe(
      '@ /shop?category=Maps&tag=bali',
    )
  })

  it('keeps a subdomain other than www apart from the main site', () => {
    expect(key('https://shop.example-shop.test/products/tote')).toBe('shop /products/tote')
    expect(hostLabel('www.example-shop.test', DOMAIN)).toBe('@')
  })

  it('rejects another host, an unparsable URL and anything carrying an email address', () => {
    expect(normaliseUrl('https://elsewhere.test/page', DOMAIN)).toEqual({
      ok: false,
      reason: 'foreign-host',
    })
    expect(normaliseUrl('https://notexample-shop.test/', DOMAIN)).toMatchObject({ ok: false })
    expect(normaliseUrl('http://[bad', DOMAIN)).toEqual({ ok: false, reason: 'unparsable' })
    expect(
      normaliseUrl('https://www.example-shop.test/mailto:a.person@example.org', DOMAIN),
    ).toEqual({ ok: false, reason: 'personal' })
    expect(normaliseUrl('https://www.example-shop.test/x?tag=a%40example.org', DOMAIN)).toEqual({
      ok: false,
      reason: 'personal',
    })
  })
})

describe('the parts', () => {
  it('normalisePathname keeps the root', () => {
    expect(normalisePathname('')).toBe('/')
    expect(normalisePathname('///')).toBe('/')
  })

  it('keptQuery sorts keys and drops empty values', () => {
    expect(keptQuery(new URLSearchParams('tag=&category=b&category=a'))).toBe(
      'category=a&category=b',
    )
  })
})
