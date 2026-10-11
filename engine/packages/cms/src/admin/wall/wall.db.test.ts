/**
 * The Catalogue Wall on a real, pushed Postgres (TASKS.md 16.2): the owner and an editor are given
 * the wall and a store user is redirected to the order panel before anything renders; a draft, an
 * out-of-stock product, a work with no picture, an AI draft to check and a sold work each wear
 * their own tag; and the wall's filters narrow what they should. The view is the real component,
 * reading through the Local API with `overrideAccess: false`.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'

import { loadWall, type WallCard } from './data'
import { parseFilter } from './filter'
import { CatalogueWall } from './view'

type Doc = { id: number }
type Role = 'owner' | 'editor' | 'store'

describe.skipIf(!server)('the Catalogue Wall, on a real database', () => {
  let stack: StaffStack
  let card: Record<string, WallCard>

  const as = (role: Role) => ({ ...stack.users[role], collection: 'users' })
  const view = (role: Role, searchParams: Record<string, string> = {}) =>
    CatalogueWall({
      initPageResult: {
        req: { user: as(role), payload: stack.payload, i18n: { language: 'en' } },
        locale: { code: 'en' },
      },
      searchParams,
    })
  const wall = async (params: Record<string, string> = {}) =>
    loadWall({ payload: stack.payload, user: as('owner'), locale: 'en' }, parseFilter(params))

  const mediaRow = async (role: string, subject: string) =>
    (
      (await stack.payload.db.create({
        collection: 'media',
        data: {
          alt: { en: `A ${role}` },
          altSource: { en: 'cataloguer' },
          subject,
          role,
          provenance: 'photograph',
          filename: `${role}-${Math.random()}.jpg`,
          mimeType: 'image/jpeg',
        },
      })) as unknown as Doc
    ).id

  const stockRow = (product: number, quantity: number, variantSku?: string) =>
    stack.payload.db.create({
      collection: 'stock-levels',
      data: { store: stack.stores[0].id, product, quantity, variantSku },
    })

  beforeAll(async () => {
    stack = await startStaffStack('cms_wall_test', (config, key) => getPayload({ config, key }))
    const { payload } = stack
    const workImage = await mediaRow('recto', 'work')
    const productImage = await mediaRow('flat', 'product')
    // A write to a product or a work invalidates the storefront's cache: inside a batch, as a request does.
    const create = (
      collection: 'products' | 'works',
      data: Record<string, unknown>,
      draft = false,
    ) =>
      invalidationBatch().operation((context) =>
        payload.create({ collection, data: data as never, draft, context } as never),
      ) as unknown as Promise<Doc>
    const product = (sku: string, extra: Record<string, unknown>) =>
      create('products', { sku, name: `Product ${sku}`, price: 95000, ...extra })

    const category = (await payload.create({
      collection: 'terms',
      data: { kind: 'subject', label: 'Prints' } as never,
    })) as unknown as Doc
    const live = { images: [{ image: productImage }], category: category.id, _status: 'published' }
    const out = await product('WALL-OUT', live)
    const stocked = await product('WALL-STOCKED', live)
    await product('WALL-DRAFT', { images: [{ image: productImage }] })
    await product('WALL-NOPHOTO', {})
    await stockRow(out.id, 0)
    await stockRow(stocked.id, 4)

    const work = (stockNumber: string, extra: Record<string, unknown>) =>
      create('works', { title: `Work ${stockNumber}`, stockNumber, ...extra }, true)
    const withImage = { images: [{ media: workImage }] }
    await work('P.1', withImage)
    await work('P.2', {})
    const ai = await work('P.3', withImage)
    await work('P.4', { ...withImage, status: 'sold' })
    // The drafting tool alone writes `aiDraft` (`ai/audit`): set it as that tool would.
    // `ai.id` is a number the test just made, never request text.
    await stack.pool.query(
      `UPDATE _works_v SET version_cataloguing_ai_draft_title_drafted = true WHERE parent_id = ${Number(ai.id)} AND latest = true`,
    )

    const everything = await wall({})
    card = Object.fromEntries(everything.cards.map((c) => [c.reference, c]))
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  it('gives the owner and an editor the wall', async () => {
    for (const role of ['owner', 'editor'] as const) {
      const element = (await view(role)) as { type: string; props: { className: string } }
      expect(element.type).toBe('main')
      expect(element.props.className).toBe('wall')
    }
  }, 60_000)

  it('sends a store user to the order panel before anything renders', async () => {
    const thrown = await view('store').catch((error: unknown) => error as { digest?: string })
    expect(String((thrown as { digest?: string }).digest)).toContain('NEXT_REDIRECT')
    expect(String((thrown as { digest?: string }).digest)).toContain('/admin/orders')
  })

  it('tags a draft, a record with no picture and an AI draft to check', () => {
    expect(card['P.1']?.tag).toBe('draft')
    expect(card['P.2']?.tag).toBe('needsPhoto')
    expect(card['P.3']?.tag).toBe('aiDraft')
    expect(card['WALL-DRAFT']?.tag).toBe('draft')
    expect(card['WALL-NOPHOTO']?.tag).toBe('needsPhoto')
  })

  it('tags a product whose stock rows sum to zero Out of stock, and one with units Published', () => {
    expect(card['WALL-OUT']?.tag).toBe('outOfStock')
    expect(card['WALL-STOCKED']?.tag).toBe('published')
  })

  it('links every card to its record’s edit page', () => {
    expect(card['WALL-OUT']?.href).toMatch(/^\/admin\/collections\/products\/\d+$/)
    expect(card['P.1']?.href).toMatch(/^\/admin\/collections\/works\/\d+$/)
  })

  it('filters by site, state and search', async () => {
    const gallery = await wall({ site: 'gallery' })
    expect(gallery.cards.every((c) => c.kind === 'work')).toBe(true)
    expect(gallery.total).toBe(4)

    const shop = await wall({ site: 'shop', state: 'sold' })
    expect(shop.cards.map((c) => c.reference)).toEqual(['WALL-OUT'])

    const sold = await wall({ site: 'gallery', state: 'sold' })
    expect(sold.cards.map((c) => c.reference)).toEqual(['P.4'])

    expect((await wall({ state: 'ai' })).cards.map((c) => c.reference)).toEqual(['P.3'])

    const attention = await wall({ state: 'attention' })
    expect(attention.cards.map((c) => c.reference).sort()).toEqual(
      ['WALL-DRAFT', 'WALL-NOPHOTO', 'P.1', 'P.2', 'P.3', 'P.4'].sort(),
    )

    expect((await wall({ q: 'WALL-STOCKED' })).cards.map((c) => c.reference)).toEqual([
      'WALL-STOCKED',
    ])
    expect((await wall({ q: 'nothing like this' })).cards).toEqual([])
  })

  it('merges both collections, newest edit first', async () => {
    const all = await wall({})
    expect(all.total).toBe(8)
    const times = all.cards.map((c) => c.updatedAt)
    expect([...times].sort().reverse()).toEqual(times)
  })
})
