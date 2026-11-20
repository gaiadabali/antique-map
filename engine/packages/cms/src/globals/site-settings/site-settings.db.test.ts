/**
 * `site-settings` on a real Postgres (TASKS.md 3.4.b, 27.1.b, 27.1.e): only the owner reads or
 * updates the global — editors, store staff and the public are refused both. The shop's welcome
 * discount is picked and the code the checkout reads follows the pick; a social link's platform
 * is picked, and an older row's typed name finds its platform on the next save.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// A save expires a cache tag after the response; outside a Next request there is no `after()`.
vi.mock('@engine/cache', async (original) => ({
  ...(await original<typeof import('@engine/cache')>()),
  invalidate: () => {},
}))

import { startWorksStack, server, type Role } from '../../collections/works/works.test-support'

const ROUTE = '/api/globals/site-settings'

type ShopSettings = {
  welcomeOffer?: number | null
  welcomeDiscount?: string | null
  social?: { network?: string | null; platform?: string; url?: string }[]
  lowStockThreshold?: number | null
}

describe.skipIf(!server)('site-settings: access on a real database', () => {
  let stack: Awaited<ReturnType<typeof startWorksStack>>

  beforeAll(async () => {
    stack = await startWorksStack('cms_site_settings_access_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const shop = async () =>
    ((await stack.payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true }))
      .shop ?? {}) as ShopSettings

  it('only the owner reads site settings; editors, stores and the public are refused', async () => {
    expect((await stack.rest('GET', ROUTE, { role: 'owner' })).status).toBe(200)
    for (const role of ['editor', 'store'] as Role[]) {
      expect((await stack.rest('GET', ROUTE, { role })).status).toBe(403)
    }
    expect((await stack.rest('GET', ROUTE)).status).toBe(403)
  })

  it('only the owner updates them; editors, stores and the public are refused', async () => {
    const json = { shop: { lowStockThreshold: 5 } }
    for (const role of ['editor', 'store'] as Role[]) {
      expect((await stack.rest('POST', ROUTE, { role, json })).status, role).toBe(403)
    }
    expect((await stack.rest('POST', ROUTE, { json })).status).toBe(403)
    expect((await shop()).lowStockThreshold).not.toBe(5)
    expect((await stack.rest('POST', ROUTE, { role: 'owner', json })).status).toBe(200)
    expect((await shop()).lowStockThreshold).toBe(5)
  })

  it('keeps the checkout’s welcome code in step with the picked discount', async () => {
    const discount = await stack.api.create({
      collection: 'discounts',
      data: { code: 'WELCOME10', kind: 'percent', value: 10, active: true },
    })
    // An older writer setting the code alone keeps it (the order tests' fixture does).
    await stack.payload.updateGlobal({
      slug: 'site-settings',
      data: { shop: { welcomeDiscount: 'LEGACY5' } } as never,
    })
    expect((await shop()).welcomeDiscount).toBe('LEGACY5')

    const picked = await stack.rest('POST', ROUTE, {
      role: 'owner',
      json: { shop: { welcomeOffer: discount.id } },
    })
    expect(picked.status).toBe(200)
    expect(await shop()).toMatchObject({ welcomeOffer: discount.id, welcomeDiscount: 'WELCOME10' })

    const cleared = await stack.rest('POST', ROUTE, {
      role: 'owner',
      json: { shop: { welcomeOffer: null } },
    })
    expect(cleared.status).toBe(200)
    expect(await shop()).toMatchObject({ welcomeOffer: null, welcomeDiscount: '' })
  })

  it('names a social link’s platform from the list, and finds it from an older typed name', async () => {
    await stack.payload.updateGlobal({
      slug: 'site-settings',
      data: {
        shop: {
          social: [
            { network: 'tiktok', url: 'https://www.tiktok.com/@oldeastindies' },
            { platform: ' instagram ', url: 'https://www.instagram.com/oldeastindiesart/' },
          ],
        },
      } as never,
    })
    expect((await shop()).social?.map(({ network, platform }) => ({ network, platform }))).toEqual([
      { network: 'tiktok', platform: 'TikTok' },
      { network: 'instagram', platform: 'Instagram' },
    ])
    await expect(
      stack.payload.updateGlobal({
        slug: 'site-settings',
        data: {
          shop: { social: [{ platform: 'Myspace', url: 'https://myspace.com/x' }] },
        } as never,
      }),
    ).rejects.toThrow()
  })
})
