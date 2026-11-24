/**
 * `GET /api/x/media/{id}`: a published page's video or PDF, from the site's own origin — its
 * stored type with `nosniff`, a PDF inline and sandboxed, a video in ranges — and every miss one
 * plain 404. The rule of which file is public is `@engine/cms`'s, faked here.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PublicMediaFile } from './payload-media'
import { rangeOf } from './range'
import { mediaRoute, MEDIA_CACHE_CONTROL, type MediaFileLoader } from './route'

// Were `./route` to import the Payload-backed port statically, this file could not load.
vi.mock('./payload-media', () => {
  throw new Error('a media route test loaded ./payload-media, and with it Payload')
})

const BYTES = new TextEncoder().encode('0123456789')

function fileOf(kind: 'video' | 'pdf', overrides: Partial<PublicMediaFile> = {}): PublicMediaFile {
  return {
    kind,
    mimeType: kind === 'pdf' ? 'application/pdf' : 'video/mp4',
    filename: kind === 'pdf' ? 'Price list "2027".pdf' : 'clip.mp4',
    size: BYTES.length,
    read: async ({ start, end }) => ({
      body: new Response(BYTES.slice(start, end + 1)).body!,
      length: end - start + 1,
    }),
    ...overrides,
  }
}

const loaderOf =
  (file: PublicMediaFile | null): MediaFileLoader =>
  async () => ({ publicMediaFileFor: async () => file })
const get = (file: PublicMediaFile | null, id = '12', headers: Record<string, string> = {}) =>
  mediaRoute(loaderOf(file))(new Request(`http://shop.localhost/api/x/media/${id}`, { headers }), {
    params: Promise.resolve({ id }),
  })

afterEach(() => vi.restoreAllMocks())

describe('a byte range', () => {
  it('reads one range, the last N bytes, or the whole file', () => {
    expect(rangeOf(null, 10)).toEqual({ type: 'full' })
    expect(rangeOf('bytes=0-', 10)).toEqual({ type: 'partial', start: 0, end: 9 })
    expect(rangeOf('bytes=2-5', 10)).toEqual({ type: 'partial', start: 2, end: 5 })
    expect(rangeOf('bytes=4-99', 10)).toEqual({ type: 'partial', start: 4, end: 9 })
    expect(rangeOf('bytes=-3', 10)).toEqual({ type: 'partial', start: 7, end: 9 })
    expect(rangeOf('bytes=0-1,4-5', 10)).toEqual({ type: 'full' })
    expect(rangeOf('items=0-1', 10)).toEqual({ type: 'full' })
    expect(rangeOf('bytes=10-', 10)).toEqual({ type: 'unsatisfiable' })
    expect(rangeOf('bytes=5-2', 10)).toEqual({ type: 'unsatisfiable' })
  })
})

describe('GET /api/x/media/{id}', () => {
  it('serves a PDF inline, sandboxed, with its stored type and nosniff', async () => {
    const response = await get(fileOf('pdf'))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('content-security-policy')).toBe('sandbox')
    expect(response.headers.get('content-disposition')).toBe(
      'inline; filename="Price_list_2027_.pdf"',
    )
    expect(response.headers.get('cache-control')).toBe(MEDIA_CACHE_CONTROL)
    expect(response.headers.get('content-length')).toBe('10')
    expect(await response.text()).toBe('0123456789')
  })

  it('serves a video in ranges, as a player asks', async () => {
    const response = await get(fileOf('video'), '12', { range: 'bytes=2-5' })
    expect(response.status).toBe(206)
    expect(response.headers.get('content-type')).toBe('video/mp4')
    expect(response.headers.get('content-range')).toBe('bytes 2-5/10')
    expect(response.headers.get('content-length')).toBe('4')
    expect(response.headers.get('accept-ranges')).toBe('bytes')
    expect(response.headers.get('content-disposition')).toBeNull()
    expect(await response.text()).toBe('2345')
  })

  it('answers 416 for a range past the end', async () => {
    const response = await get(fileOf('video'), '12', { range: 'bytes=20-' })
    expect(response.status).toBe(416)
    expect(response.headers.get('content-range')).toBe('bytes */10')
  })

  it('answers one plain 404 for any miss: no file, a bad id, storage without the object', async () => {
    for (const response of [
      await get(null),
      await get(fileOf('pdf'), '0'),
      await get(fileOf('pdf'), 'abc'),
      await get(fileOf('pdf'), '12;drop'),
      await get(fileOf('pdf', { read: async () => null })),
    ]) {
      expect(response.status).toBe(404)
      expect(response.headers.get('cache-control')).toBe('no-store')
    }
  })

  it('answers 500 and 502 in words when the lookup or the storage fails, naming no file', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failing: MediaFileLoader = async () => ({
      publicMediaFileFor: async () => {
        throw new Error('db down: clip.mp4')
      },
    })
    const lookup = await mediaRoute(failing)(new Request('http://shop.localhost/api/x/media/3'), {
      params: Promise.resolve({ id: '3' }),
    })
    expect(lookup.status).toBe(500)
    const storage = await get(
      fileOf('video', {
        read: async () => {
          throw new Error('s3: clip.mp4')
        },
      }),
    )
    expect(storage.status).toBe(502)
    expect(errors.mock.calls.flat().join(' ')).not.toMatch(/clip\.mp4/)
  })
})
