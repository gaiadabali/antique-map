/**
 * The store editor's address search (TASKS.md 27.4.a): owner only, before anything else is touched;
 * a link or a typed pair read with no outbound call; Google's answer cut to places in Indonesia;
 * no key, no call; the checkout geocoder's limiter shared.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { limiters } from '@engine/http/limits'

import { candidatesOf, MAX_CANDIDATES, searchPlaces } from './geocode-search'

const OWNER = { isOwner: true, address: '203.0.113.9', serverKey: null }

afterEach(() => {
  limiters.geocode.reset()
})

const place = (label: string, lat: number, lng: number) => ({
  formatted_address: label,
  geometry: { location: { lat, lng } },
})

describe('searchPlaces', () => {
  it('refuses anyone but the owner, without counting against the limiter or calling out', async () => {
    const fetchJson = vi.fn()
    const answer = await searchPlaces('Ubud', {
      ...OWNER,
      isOwner: false,
      serverKey: 'k',
      fetchJson,
    })
    expect(answer).toMatchObject({ ok: false, status: 403 })
    expect(fetchJson).not.toHaveBeenCalled()
  })

  it('reads a Maps link or a typed pair with no outbound call, key or not', async () => {
    const fetchJson = vi.fn()
    const link = await searchPlaces(
      'https://www.google.com/maps/place/Ubud/@-8.5069,115.2625,14z',
      {
        ...OWNER,
        serverKey: 'k',
        fetchJson,
      },
    )
    expect(link).toEqual({
      ok: true,
      keyless: false,
      candidates: [{ label: '-8.5069, 115.2625', lat: -8.5069, lng: 115.2625 }],
    })
    const pair = await searchPlaces(' -8.65, 115.216 ', OWNER)
    expect(pair).toMatchObject({ ok: true, keyless: true, candidates: [{ lat: -8.65 }] })
    // A pin outside Indonesia is no candidate (the checkout geocoder's own box).
    expect(await searchPlaces('48.85, 2.35', OWNER)).toMatchObject({ ok: true, candidates: [] })
    expect(fetchJson).not.toHaveBeenCalled()
  })

  it('without a key, an address finds nothing and nothing leaves the machine', async () => {
    const fetchJson = vi.fn()
    const answer = await searchPlaces('Jl. Raya Ubud', { ...OWNER, fetchJson })
    expect(answer).toEqual({ ok: true, keyless: true, candidates: [] })
    expect(fetchJson).not.toHaveBeenCalled()
  })

  it('with a key, asks Google for places in Indonesia and answers the ones with a pin', async () => {
    const fetchJson = vi.fn(async () => ({
      status: 200,
      body: {
        results: [
          place('Jl. Raya Ubud, Gianyar, Bali', -8.5069, 115.2625),
          { formatted_address: 'Bad pin', geometry: { location: { lat: 400, lng: 2 } } },
          { formatted_address: 'No pin' },
        ],
      },
    }))
    const answer = await searchPlaces('Jl. Raya Ubud', { ...OWNER, serverKey: 'secret', fetchJson })
    expect(answer).toEqual({
      ok: true,
      keyless: false,
      candidates: [{ label: 'Jl. Raya Ubud, Gianyar, Bali', lat: -8.5069, lng: 115.2625 }],
    })
    const url = String((fetchJson.mock.calls[0] as unknown[])[0])
    expect(url).toContain('address=Jl.%20Raya%20Ubud')
    expect(url).toContain('components=country:ID')
  })

  it('reads a refused or failed upstream as nothing found', async () => {
    const failing = vi.fn(async () => {
      throw new Error('timeout')
    })
    const denied = vi.fn(async () => ({ status: 403, body: { status: 'REQUEST_DENIED' } }))
    for (const fetchJson of [failing, denied]) {
      const answer = await searchPlaces('Ubud', { ...OWNER, serverKey: 'k', fetchJson })
      expect(answer).toEqual({ ok: true, keyless: false, candidates: [] })
    }
  })

  it('refuses an empty or overlong query, and shares the geocoder’s limiter', async () => {
    expect(await searchPlaces('', OWNER)).toMatchObject({ ok: false, status: 400 })
    expect(await searchPlaces('x'.repeat(201), OWNER)).toMatchObject({ ok: false, status: 400 })
    expect(await searchPlaces(42, OWNER)).toMatchObject({ ok: false, status: 400 })
    limiters.geocode.reset()
    for (let i = 0; i < limiters.geocode.limit.max; i += 1) limiters.geocode.hit(OWNER.address)
    expect(await searchPlaces('Ubud', OWNER)).toMatchObject({ ok: false, status: 429 })
  })
})

describe('candidatesOf', () => {
  it('keeps at most five, and nothing from a body that is not Google’s', () => {
    const many = { results: Array.from({ length: 9 }, (_, i) => place(`P${i}`, -8.5, 115.2)) }
    expect(candidatesOf(many)).toHaveLength(MAX_CANDIDATES)
    expect(candidatesOf(null)).toEqual([])
    expect(candidatesOf({ results: 'no' })).toEqual([])
  })
})
