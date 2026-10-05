/**
 * The legacy route's real loader on a real Postgres (TASKS.md 9.4.b): three rows written through
 * the Local API — a 301, a 302 and a 410 with no destination — come back keyed as the 9.4a builder
 * keyed them, per site. It also proves the `410` option and the optional `to`.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { readRedirectMap, type RedirectReader } from '../../../../http/src/legacy/redirect-map'
import { startWorksStack, server } from '../works/works.test-support'

describe.skipIf(!server)('redirect map: the real loader on a real database', () => {
  let stack: Awaited<ReturnType<typeof startWorksStack>>
  const reader = () => stack.payload as unknown as RedirectReader

  beforeAll(async () => {
    stack = await startWorksStack('cms_redirect_map_test', (config, key) =>
      getPayload({ config, key }),
    )
    const row = (site: string, from: string, to: string | undefined, code: string) =>
      stack.api.create({
        collection: 'redirects',
        data: { site, from, ...(to === undefined ? {} : { to }), code, source: 'legacy' },
      })
    await row('gallery', '/product/1706-bali', '/item/IG-001706', '301')
    await row('gallery', '/category/1-maps?s=sold', '/browse/maps?s=sold', '301')
    await row('gallery', '/promo', '/sale', '302')
    await row('gallery', '/account', undefined, '410')
    await row('shop', '/our-collection/old', '/shop', '301')
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('returns the 301, 302 and 410 rows keyed by path and kept query, with numeric codes', async () => {
    const map = await readRedirectMap(reader(), 'gallery')
    expect([...map.entries()].sort()).toEqual([
      ['/account', { to: '', code: 410 }],
      ['/category/1-maps?s=sold', { to: '/browse/maps?s=sold', code: 301 }],
      ['/product/1706-bali', { to: '/item/IG-001706', code: 301 }],
      ['/promo', { to: '/sale', code: 302 }],
    ])
  })

  it('reads one site only', async () => {
    const map = await readRedirectMap(reader(), 'shop')
    expect([...map.keys()]).toEqual(['/our-collection/old'])
  })

  it('pages through every row', async () => {
    const paged: RedirectReader = {
      find: (args) => reader().find({ ...args, limit: 2 }),
    }
    expect((await readRedirectMap(paged, 'gallery')).size).toBe(4)
  })

  it('a 301 with no destination, or a 410 with one, is refused by the collection', async () => {
    const attempt = (data: Record<string, unknown>) =>
      stack.api.create({
        collection: 'redirects',
        data: { site: 'gallery', source: 'legacy', ...data },
      })
    await expect(attempt({ from: '/no-to', code: '301' })).rejects.toThrow()
    await expect(attempt({ from: '/gone-with-to', to: '/x', code: '410' })).rejects.toThrow()
  })
})
