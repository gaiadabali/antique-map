// The shared argument rules (ticket: "--origin with a path is refused"). `--origin` defaults to
// `--base` and must be an absolute http(s) origin with no path, query or fragment.
import { describe, expect, it } from 'vitest'

import { commonOptions, parseOrigin } from './cli-args.mjs'

describe('parseOrigin', () => {
  it('accepts an absolute origin and drops a trailing slash', () => {
    expect(parseOrigin('https://gallery.example/', '--origin')).toBe('https://gallery.example')
    expect(parseOrigin('http://127.0.0.1:4372', '--origin')).toBe('http://127.0.0.1:4372')
  })

  it('refuses an origin with a path', () => {
    expect(() => parseOrigin('https://gallery.example/staging', '--origin')).toThrow(/no path/)
  })

  it('refuses a non-http scheme and a bare host', () => {
    expect(() => parseOrigin('ftp://gallery.example', '--origin')).toThrow(/http\(s\)/)
    expect(() => parseOrigin('gallery.example', '--origin')).toThrow(/absolute/)
  })
})

describe('commonOptions', () => {
  const base = { base: 'http://127.0.0.1:4372', site: 'gallery' }

  it('defaults origin to the base', () => {
    expect(commonOptions({ ...base }).origin).toBe('http://127.0.0.1:4372')
  })

  it('takes an explicit origin', () => {
    expect(commonOptions({ ...base, origin: 'https://gallery.example' }).origin).toBe(
      'https://gallery.example',
    )
  })

  it('refuses an origin with a path', () => {
    expect(() => commonOptions({ ...base, origin: 'https://gallery.example/x' })).toThrow(/no path/)
  })
})
