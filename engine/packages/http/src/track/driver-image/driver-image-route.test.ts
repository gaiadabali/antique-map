/**
 * `GET /api/x/track/{token}/driver-image`: the order the token names, shown only once it is
 * `on_the_way` or `delivered`, its photo read on the server from a 60 s presigned URL and streamed
 * back with private, no-store, nosniff headers; every miss is one plain 404, and no log line
 * carries the token or the URL.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  DRIVER_IMAGE_URL_TTL_SECONDS,
  driverImageRoute,
  type DriverImageLoader,
  type DriverImageUrlSource,
} from './route'

// Were `./route` to import the Payload-backed port statically, this file could not load.
vi.mock('./payload-driver-image', () => {
  throw new Error('a driver-image test loaded ./payload-driver-image, and with it Payload')
})

const TOKEN = 'k3Jd9xQ2-secret_token'
const PRESIGNED = 'http://127.0.0.1:4032/indies-media/orders/15/1-ab.webp?X-Amz-Signature=sig'
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x01, 0x02, 0x03])

const request = () => new Request(`http://shop.localhost/api/x/track/${TOKEN}/driver-image`)
const context = (token: string = TOKEN) => ({ params: Promise.resolve({ token }) })
const loaderOf =
  (source: DriverImageUrlSource): DriverImageLoader =>
  async () => ({ driverImageUrlFor: source })
const served = (
  body: ConstructorParameters<typeof Response>[0] = WEBP,
  init: ResponseInit = { headers: { 'content-type': 'image/webp' } },
) => vi.fn<typeof fetch>(async () => new Response(body, init))

afterEach(() => vi.restoreAllMocks())

describe('driver-image early returns release the upstream body', () => {
  it.each([
    ['a 5xx', { status: 503 }, 502],
    ['a 404', { status: 404 }, 404],
    [
      'an oversized declared length',
      { status: 200, headers: { 'content-length': '999999999' } },
      502,
    ],
  ])('cancels the body on %s', async (_name, init, expected) => {
    const cancelled = vi.fn()
    const body = new ReadableStream({ pull: () => undefined, cancel: cancelled })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const source = vi.fn<DriverImageUrlSource>(async () => PRESIGNED)
    const response = await driverImageRoute(loaderOf(source), served(body, init))(
      request(),
      context(),
    )
    expect(response.status).toBe(expected)
    expect(cancelled).toHaveBeenCalledTimes(1)
  })
})

describe('GET /api/x/track/{token}/driver-image', () => {
  it('streams the stored bytes, with private, no-store, nosniff headers', async () => {
    const source = vi.fn<DriverImageUrlSource>(async () => PRESIGNED)
    const fetchImage = served()
    const response = await driverImageRoute(loaderOf(source), fetchImage)(request(), context())

    expect(response.status).toBe(200)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(WEBP)
    expect(response.headers.get('content-type')).toBe('image/webp')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    // The URL is signed for the token, short-lived, and fetched on the server — never handed out.
    expect(source).toHaveBeenCalledWith(TOKEN, DRIVER_IMAGE_URL_TTL_SECONDS)
    expect(DRIVER_IMAGE_URL_TTL_SECONDS).toBeLessThanOrEqual(60)
    expect(fetchImage.mock.calls[0]?.[0]).toBe(PRESIGNED)
    expect(response.headers.get('location')).toBeNull()
  })

  it('answers the same plain 404 for an unknown token, a wrong status and no image', async () => {
    // The port answers null for each: no order, an order not yet on its way, an order with no image.
    const fetchImage = served()
    const route = driverImageRoute(
      loaderOf(async () => null),
      fetchImage,
    )
    const answers = [
      await route(request(), context('no-such-token')),
      await route(request(), context('processing-order-token')),
      await route(request(), context('no-image-token')),
    ]
    for (const answer of answers) {
      expect(answer.status).toBe(404)
      expect(answer.headers.get('cache-control')).toBe('no-store')
      expect(answer.headers.get('x-content-type-options')).toBe('nosniff')
    }
    const bodies = await Promise.all(answers.map((answer) => answer.text()))
    expect(new Set(bodies).size).toBe(1)
    expect(fetchImage).not.toHaveBeenCalled()
  })

  it('answers 404 at once, without loading Payload, for an empty or oversized token', async () => {
    const load = vi.fn(loaderOf(async () => PRESIGNED))
    const route = driverImageRoute(load, served())
    expect((await route(request(), context(''))).status).toBe(404)
    expect((await route(request(), context('t'.repeat(201)))).status).toBe(404)
    expect(load).not.toHaveBeenCalled()
  })

  it('answers 404 when the stored object is gone, and 502 when storage cannot be reached', async () => {
    const load = loaderOf(async () => PRESIGNED)
    const gone = served('missing', { status: 404 })
    expect((await driverImageRoute(load, gone)(request(), context())).status).toBe(404)

    vi.spyOn(console, 'error').mockImplementation(() => {})
    const down = vi.fn<typeof fetch>(async () => {
      throw new TypeError('connect ECONNREFUSED')
    })
    expect((await driverImageRoute(load, down)(request(), context())).status).toBe(502)
    const broken = served('boom', { status: 503 })
    expect((await driverImageRoute(load, broken)(request(), context())).status).toBe(502)
  })

  it('serves an image type storage names, and the stored type when it names none', async () => {
    const load = loaderOf(async () => PRESIGNED)
    const png = served(WEBP, { headers: { 'content-type': 'image/png' } })
    const png200 = await driverImageRoute(load, png)(request(), context())
    expect(png200.headers.get('content-type')).toBe('image/png')
    const html = served(WEBP, { headers: { 'content-type': 'text/html' } })
    const fallback = await driverImageRoute(load, html)(request(), context())
    expect(fallback.headers.get('content-type')).toBe('image/webp')
  })

  it('logs neither the token nor the presigned URL, when a lookup or a read fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const lookupFails = loaderOf(async () => {
      throw new Error(`database error near ${TOKEN}`)
    })
    const lookup = await driverImageRoute(lookupFails, served())(request(), context())
    expect(lookup.status).toBe(500)

    const readFails = vi.fn<typeof fetch>(async () => {
      throw new TypeError(`failed to fetch ${PRESIGNED}`)
    })
    const read = await driverImageRoute(
      loaderOf(async () => PRESIGNED),
      readFails,
    )(request(), context())
    expect(read.status).toBe(502)

    expect(logged).toHaveBeenCalledTimes(2)
    const lines = logged.mock.calls.flat().map(String).join('\n')
    expect(lines).toContain('[track/driver-image]')
    expect(lines).not.toContain(TOKEN)
    expect(lines).not.toContain('X-Amz')
    expect(lines).not.toContain('127.0.0.1')
    for (const answer of [lookup, read]) expect(await answer.text()).not.toContain(TOKEN)
  })
})
