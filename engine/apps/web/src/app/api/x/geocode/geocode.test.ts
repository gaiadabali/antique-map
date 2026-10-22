/**
 * The geocode route's tests (TASKS.md 6.3.a): the three link shapes, the Indonesia box, garbage
 * input, and the no-key case — where nothing may leave the machine.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { limiters } from '../../../../security/rate-limit'
import {
  fetchGeocodeJson,
  GEOCODE_TIMEOUT_MS,
  geocode,
  MAX_GEOCODE_BYTES,
  parseMapsLink,
} from '../../../../server/shop/checkout/geocode'
import { POST } from './route'

const BASE = { address: '203.0.113.9', serverKey: null }

afterEach(() => {
  limiters.geocode.reset()
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

  it('the 31st request in a minute from one address is dropped with a 429 (30 a minute, S5)', async () => {
    const pin = { lat: -8.65, lng: 115.216 }
    const answers = []
    for (let i = 0; i < 31; i += 1) {
      answers.push(await geocode(pin, { address: '198.51.100.7', serverKey: null }))
    }
    expect(answers.slice(0, 30).every((answer) => answer.ok)).toBe(true)
    expect(answers[30]).toMatchObject({ ok: false, status: 429 })
    // Another address has its own allowance.
    expect(await geocode(pin, { address: '198.51.100.8', serverKey: null })).toMatchObject({
      ok: true,
    })
  })
})

describe('the route keys the limit on the address nginx appended (F-05)', () => {
  const post = (forwarded: string) =>
    POST(
      new Request('http://localhost/api/x/geocode', {
        method: 'POST',
        headers: { 'x-forwarded-for': forwarded, 'content-type': 'application/json' },
        body: JSON.stringify({ lat: -8.65, lng: 115.216 }),
      }),
    )

  it('a forged leading entry each time does not escape the limit', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 40; i += 1) {
      statuses.push((await post(`10.0.${i}.1, 203.0.113.50`)).status)
    }
    expect(statuses.slice(0, 30).every((status) => status === 200)).toBe(true)
    expect(statuses.slice(30)).toEqual(Array(10).fill(429))
    // A different real address (the last entry) is untouched, whatever it forges before it.
    expect((await post('10.0.0.1, 203.0.113.51')).status).toBe(200)
  })
})

describe('the upstream call (S3, F-07)', () => {
  const answer = (body: string, init: ResponseInit = {}) => new Response(body, init)

  it('is made with a 5 second timeout and no redirect followed', async () => {
    const fetcher = vi.fn().mockResolvedValue(answer('{"results":[]}'))
    await fetchGeocodeJson('https://maps.googleapis.com/x', fetcher)
    const init = fetcher.mock.calls[0]![1] as RequestInit
    expect(init.redirect).toBe('error')
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(GEOCODE_TIMEOUT_MS).toBe(5000)
  })

  it('reads a small JSON answer', async () => {
    const fetcher = vi.fn().mockResolvedValue(answer('{"results":[{"formatted_address":"Ubud"}]}'))
    expect(await fetchGeocodeJson('u', fetcher)).toEqual({
      status: 200,
      body: { results: [{ formatted_address: 'Ubud' }] },
    })
  })

  it('drops an answer that declares more than the cap, and one that streams more', async () => {
    const declared = answer('{}', { headers: { 'content-length': String(MAX_GEOCODE_BYTES + 1) } })
    expect((await fetchGeocodeJson('u', vi.fn().mockResolvedValue(declared))).body).toBeNull()
    const big = answer('x'.repeat(MAX_GEOCODE_BYTES + 10))
    expect((await fetchGeocodeJson('u', vi.fn().mockResolvedValue(big))).body).toBeNull()
  })

  it('treats a non-JSON answer as no body', async () => {
    const fetcher = vi.fn().mockResolvedValue(answer('<html>', { status: 502 }))
    expect(await fetchGeocodeJson('u', fetcher)).toEqual({ status: 502, body: null })
  })

  it('lets a redirect or a timeout reject, which the geocoder turns into no address', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('redirect mode is set to error'))
    await expect(fetchGeocodeJson('u', fetcher)).rejects.toThrow()
    const failing = vi.fn().mockRejectedValue(new Error('boom'))
    expect(
      await geocode(
        { lat: -8.65, lng: 115.216 },
        { address: '203.0.113.60', serverKey: 'k', fetchJson: failing },
      ),
    ).toMatchObject({ ok: true, address: null })
  })
})

describe('fetchGeocodeJson releases an over-long answer', () => {
  it('cancels the body when the declared length is over the cap', async () => {
    const cancelled = vi.fn()
    const body = new ReadableStream({ pull: () => undefined, cancel: cancelled })
    const fetcher = vi.fn(
      async () =>
        new Response(body, { headers: { 'content-length': String(MAX_GEOCODE_BYTES + 1) } }),
    )
    expect((await fetchGeocodeJson('u', fetcher as unknown as typeof fetch)).body).toBeNull()
    expect(cancelled).toHaveBeenCalledTimes(1)
  })
})

describe('POST /api/x/geocode body cap', () => {
  /** A chunked body (no Content-Length) whose pulls are counted, to see the read stop. */
  function chunked(totalKb: number, pulled: { kb: number }): Request {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pulled.kb >= totalKb) return controller.close()
        pulled.kb += 1
        controller.enqueue(new Uint8Array(1024).fill(97))
      },
    })
    return new Request('http://localhost/api/x/geocode', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit)
  }

  it('stops reading a chunked body past the cap and answers as for an empty one', async () => {
    const pulled = { kb: 0 }
    const over = await POST(chunked(4096, pulled))
    const empty = await POST(
      new Request('http://localhost/api/x/geocode', { method: 'POST', body: '' }),
    )
    expect(over.status).toBe(empty.status)
    expect(pulled.kb).toBeLessThan(64)
  })
})
