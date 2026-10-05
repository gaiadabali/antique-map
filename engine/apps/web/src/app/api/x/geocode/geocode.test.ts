/**
 * The geocode route's tests (TASKS.md 6.3.a): the three link shapes, the Indonesia box, garbage
 * input, and the no-key case — where nothing may leave the machine.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { rateLimiter } from '../../../../server/analytics/rate'
import { geocode, parseMapsLink } from '../../../../server/shop/checkout/geocode'

const BASE = { address: '203.0.113.9', serverKey: null }

afterEach(() => {
  rateLimiter.reset()
})

describe('parseMapsLink', () => {
  it('parses the three link shapes', () => {
    // `@lat,lng` — the map centre, as shared maps and `/place/…` links carry it.
    expect(parseMapsLink('https://maps.app.goo.gl/abc?g_st=ic')).toBe(null)
    expect(parseMapsLink('https://www.google.com/maps/@-8.650,115.216,13z')).toEqual({
      lat: -8.65,
      lng: 115.216,
    })
    expect(parseMapsLink('https://www.google.com/maps/place/Ubud/@-8.5069,115.2625,14z')).toEqual({
      lat: -8.5069,
      lng: 115.2625,
    })
    // `?q=lat,lng`
    expect(parseMapsLink('https://maps.google.com/?q=-8.65,115.216')).toEqual({
      lat: -8.65,
      lng: 115.216,
    })
    // A bare `lat,lng` typed straight in.
    expect(parseMapsLink('-8.65, 115.216')).toEqual({ lat: -8.65, lng: 115.216 })
  })

  it('refuses what it cannot find a pin in', () => {
    expect(parseMapsLink('https://maps.google.com/place/Ubud')).toBe(null)
    expect(parseMapsLink('hello')).toBe(null)
    expect(parseMapsLink('')).toBe(null)
    expect(parseMapsLink('999,9999')).toBe(null)
  })
})

describe('geocode', () => {
  it('parses the three link shapes through the route input', async () => {
    for (const link of [
      'https://www.google.com/maps/@-8.650,115.216,13z',
      'https://www.google.com/maps/place/Ubud/@-8.5069,115.2625,14z',
      'https://maps.google.com/?q=-8.65,115.216',
    ]) {
      const answer = await geocode({ link }, BASE)
      expect(answer.ok).toBe(true)
      if (answer.ok) {
        expect(answer.address).toBe(null)
        expect(answer.lat).toBeGreaterThan(-9)
        expect(answer.lng).toBeGreaterThan(114)
      }
    }
  })

  it('answers a direct lat/lng pin', async () => {
    const answer = await geocode({ lat: '-8.65', lng: 115.216 }, BASE)
    expect(answer).toMatchObject({ ok: true, lat: -8.65, lng: 115.216, address: null })
  })

  it('a pin outside Indonesia is refused', async () => {
    const answer = await geocode({ lat: 35.68, lng: 139.76 }, BASE) // Tokyo
    expect(answer).toMatchObject({ ok: false, status: 400 })
    expect(answer.ok === false && answer.message).toMatch(/Indonesia/)
  })

  it('garbage input is a 400 with a plain message', async () => {
    for (const input of [{}, { link: 'nonsense' }, { lat: 'abc', lng: 'def' }, { link: 42 }]) {
      const answer = await geocode(input, BASE)
      expect(answer).toMatchObject({ ok: false, status: 400 })
      expect(answer.ok === false && answer.message).toBeTruthy()
    }
  })

  it('no key → no outbound call', async () => {
    const fetchJson = vi.fn()
    const answer = await geocode({ lat: -8.65, lng: 115.216 }, { ...BASE, fetchJson })
    expect(answer).toMatchObject({ ok: true, address: null })
    expect(fetchJson).not.toHaveBeenCalled()
  })

  it('with a key, the display address comes from one call', async () => {
    const fetchJson = vi.fn().mockResolvedValue({
      status: 200,
      body: { results: [{ formatted_address: 'Jl. Raya Ubud No. 1, Ubud' }] },
    })
    const answer = await geocode(
      { lat: -8.65, lng: 115.216 },
      { address: '203.0.113.9', serverKey: 'test-key', fetchJson },
    )
    expect(answer).toMatchObject({ ok: true, address: 'Jl. Raya Ubud No. 1, Ubud' })
    expect(fetchJson).toHaveBeenCalledTimes(1)
  })

  it('a burst from one address is dropped with a 429', async () => {
    for (let i = 0; i < 240; i += 1) rateLimiter.allowAddress('198.51.100.7')
    const answer = await geocode(
      { lat: -8.65, lng: 115.216 },
      { address: '198.51.100.7', serverKey: null },
    )
    expect(answer).toMatchObject({ ok: false, status: 429 })
  })
})
