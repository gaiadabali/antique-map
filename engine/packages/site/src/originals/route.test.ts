/**
 * The gallery's public read API's handlers (TASKS.md 23.5.a): the gallery's host only, limited per
 * address, a malformed or unknown number a 404, projected JSON, a failed read a 503.
 */
import { describe, expect, it, vi } from 'vitest'

import { parseFeatured, parseOriginal, type OriginalWork } from './contract'
import { originalsRoute, type OriginalsReads } from './route'

const WORK: OriginalWork = {
  stockNumber: 'M.1044',
  title: 'Insulae Iavae',
  url: 'https://gallery.localhost/en/item/12-insulae-iavae',
  image: { url: 'https://media.example.test/d/640.webp', alt: 'A map', width: 640, height: 480 },
}

const request = (path: string, host = 'gallery.localhost', ip = '203.0.113.9') =>
  new Request(`http://${host}${path}`, { headers: { host, 'x-forwarded-for': ip } })

function reads(over: Partial<OriginalsReads> = {}): OriginalsReads {
  return {
    servesHost: (host) => host === 'gallery.localhost',
    byStockNumber: async (stock) => (stock === WORK.stockNumber ? WORK : null),
    featured: async () => [],
    limiter: { hit: () => 0 },
    ...over,
  }
}

describe('GET /api/x/originals/{stockNumber}', () => {
  it('answers a published work, projected, with a short shared cache life', async () => {
    const byStockNumber = vi.fn(reads().byStockNumber)
    const route = originalsRoute(reads({ byStockNumber }))
    const res = await route.byStockNumber(request('/api/x/originals/M.1044?locale=id'), 'M.1044')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^application\/json/)
    expect(res.headers.get('cache-control')).toBe('public, max-age=300')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    const body = await res.json()
    expect(body).toEqual({ work: WORK })
    expect(parseOriginal(body)).toEqual(WORK)
    expect(byStockNumber).toHaveBeenCalledWith('M.1044', 'id')
  })

  it('is a 404 for an unknown or unpublished number — the read answers null for both', async () => {
    const res = await originalsRoute(reads()).byStockNumber(request('/api/x/originals/M.9'), 'M.9')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not-found' })
  })

  it('is a 404 for a malformed number, which never reaches the read', async () => {
    const byStockNumber = vi.fn(async () => WORK)
    const route = originalsRoute(reads({ byStockNumber }))
    for (const bad of ['../users', 'M 1', 'featured', '', 'x'.repeat(41)]) {
      expect((await route.byStockNumber(request('/api/x/originals/x'), bad)).status).toBe(404)
    }
    expect(byStockNumber).not.toHaveBeenCalled()
  })

  it('answers only on the gallery’s host: the shop’s or any other is a plain 404', async () => {
    const byStockNumber = vi.fn(async () => WORK)
    const route = originalsRoute(reads({ byStockNumber }))
    const res = await route.byStockNumber(
      request('/api/x/originals/M.1044', 'shop.localhost'),
      'M.1044',
    )
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(byStockNumber).not.toHaveBeenCalled()
  })

  it('answers 429 with Retry-After past the per-address limit, before any read', async () => {
    const byStockNumber = vi.fn(async () => WORK)
    const hit = vi.fn((key: string) => (key === '203.0.113.9' ? 42 : 0))
    const route = originalsRoute(reads({ byStockNumber, limiter: { hit } }))
    const res = await route.byStockNumber(request('/api/x/originals/M.1044'), 'M.1044')
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('42')
    expect(byStockNumber).not.toHaveBeenCalled()
  })

  it('answers 503, uncached, when the read fails', async () => {
    const route = originalsRoute(
      reads({
        byStockNumber: async () => {
          throw new Error('db down postgres://user:pw@x')
        },
      }),
    )
    const res = await route.byStockNumber(request('/api/x/originals/M.1044'), 'M.1044')
    expect(res.status).toBe(503)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.text()).not.toContain('postgres')
  })
})

describe('GET /api/x/originals/featured', () => {
  it('answers the featured works in the asked locale', async () => {
    const works = [
      { title: 'Java', date: '1598', maker: 'Linschoten', url: WORK.url, image: WORK.image! },
    ]
    const featured = vi.fn(async () => works)
    const res = await originalsRoute(reads({ featured })).featured(
      request('/api/x/originals/featured?locale=id'),
    )
    expect(res.status).toBe(200)
    expect(parseFeatured(await res.json())).toEqual(works)
    expect(featured).toHaveBeenCalledWith('id')
  })

  it('is a 404 off the gallery’s host', async () => {
    const res = await originalsRoute(reads()).featured(
      request('/api/x/originals/featured', 'admin.localhost'),
    )
    expect(res.status).toBe(404)
  })
})
