// The base/origin rewrite (ticket: "a sitemap on the canonical origin is crawled through the base";
// "a sitemap loc on another origin fails and is not requested"). A URL on the canonical origin keeps
// its path and query but moves onto the base; any other origin is left alone and flagged `foreign`.
import { describe, expect, it } from 'vitest'

import { isOnOrigin, toBase } from './to-base.mjs'

const origin = 'https://gallery.example'
const base = 'http://127.0.0.1:4372'

describe('toBase', () => {
  it('rewrites a URL on the canonical origin onto the base, keeping path and query', () => {
    const mapped = toBase('https://gallery.example/product/1706?o=newest', { origin, base })
    expect(mapped).toEqual({ url: `${base}/product/1706?o=newest`, foreign: false })
  })

  it('keeps a bare root path', () => {
    expect(toBase(`${origin}/`, { origin, base })).toEqual({ url: `${base}/`, foreign: false })
  })

  it('flags a URL on another origin as foreign and returns it unchanged', () => {
    const url = 'https://evil.example/x'
    expect(toBase(url, { origin, base })).toEqual({ url, foreign: true })
  })

  it('treats a different port on the same host as foreign', () => {
    const url = 'https://gallery.example:8443/x'
    expect(toBase(url, { origin, base }).foreign).toBe(true)
  })

  it('flags an unparsable URL as foreign', () => {
    expect(toBase('not a url', { origin, base })).toEqual({ url: 'not a url', foreign: true })
  })

  it('is a no-op rewrite when the base and the origin are the same', () => {
    expect(toBase(`${origin}/x`, { origin, base: origin })).toEqual({
      url: `${origin}/x`,
      foreign: false,
    })
  })
})

describe('isOnOrigin', () => {
  it('is true only on the exact origin', () => {
    expect(isOnOrigin(`${origin}/x`, origin)).toBe(true)
    expect(isOnOrigin('https://other.example/x', origin)).toBe(false)
    expect(isOnOrigin('garbage', origin)).toBe(false)
  })
})
