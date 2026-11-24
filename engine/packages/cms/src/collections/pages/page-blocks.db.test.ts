/**
 * A shop page's blocks, by its kind, on a real, pushed Postgres (TASKS.md 27.1.c, 27.1.e): the
 * home takes the home's blocks and the general ones, the partnership page the partnership's and
 * the general ones, any other page the general ones only — refused on save, over REST and on the
 * Local API, an update that leaves out the address included. A products rail picked by
 * hand needs its products, and one from a category its category.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { makeProduct } from '@engine/cms-shop/collections/stock-levels/shop.test-support'
import { server, startStaffStack, type StaffStack } from '../users/staff.test-support'

const HERO = { blockType: 'homeHero', title: 'Maps of the old Indies' }
const OFFER = { blockType: 'offer', title: 'Stock our prints' }
const TEXT = { blockType: 'text', body: 'Some words.' }

describe.skipIf(!server)('shop page blocks by kind of page, on a real database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_page_blocks_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const page = (slug: string, layout: unknown[]) =>
    stack.rest('POST', '/api/pages?locale=en&draft=true', {
      as: 'owner',
      json: { site: 'shop', kind: 'page', slug, title: slug, layout },
    })

  it('offers each kind of page its own blocks and the general ones', async () => {
    expect((await page('home', [HERO, TEXT])).status).toBe(201)
    expect((await page('partnership', [OFFER, TEXT])).status).toBe(201)
    expect((await page('about-us', [TEXT])).status).toBe(201)
  })

  it('refuses a block the kind of page may not have', async () => {
    const refusals = [
      await page('delivery', [HERO]),
      await page('returns', [OFFER]),
      await page('partnership-2', [TEXT, HERO]),
    ]
    for (const refused of refusals) expect(refused.status).toBe(400)
    expect(JSON.stringify(refusals[0]!.body)).toMatch(/homeHero/)
  })

  it('judges an update that leaves out the address by the stored page', async () => {
    const created = await page('faq', [TEXT])
    const id = (created.body as { doc: { id: number } }).doc.id
    await expect(
      stack.payload.update({
        collection: 'pages',
        id,
        locale: 'en',
        draft: true,
        data: { layout: [HERO] } as never,
      }),
    ).rejects.toThrow('Sections > Block 1 (Hero — home)')
  })

  it('asks a hand-picked rail for its products and a category rail for its category', async () => {
    const print = await makeProduct(stack.payload, 'OEI-RAIL')
    // Rails are the home's blocks: the home made by the first test takes them.
    const home = (await stack.payload.find({
      collection: 'pages',
      draft: true,
      where: { slug: { equals: 'home' } },
      limit: 1,
    })) as unknown as { docs: { id: number }[] }
    const homeId = home.docs[0]!.id
    const rail = (fields: Record<string, unknown>) => ({ blockType: 'productRail', ...fields })
    const update = (layout: unknown[]) =>
      stack.payload.update({
        collection: 'pages',
        id: homeId,
        locale: 'en',
        draft: true,
        data: { layout } as never,
      }) as unknown as Promise<{ layout: { source: string; products: unknown[] }[] }>
    await expect(update([rail({ source: 'picked' })])).rejects.toThrow()
    await expect(update([rail({ source: 'category' })])).rejects.toThrow()
    const saved = await update([rail({ source: 'picked', products: [print.id] })])
    expect(saved.layout[0]!.source).toBe('picked')
    const ids = saved.layout[0]!.products.map((p) =>
      typeof p === 'object' && p !== null ? (p as { id: number }).id : p,
    )
    expect(ids).toEqual([print.id])
  })
})
