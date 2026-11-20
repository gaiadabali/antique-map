import { describe, expect, it } from 'vitest'

import { CONTENT_BLOCKS } from './content'
import { HOME_BLOCKS } from './home'
import { BLOCKS_BY_KIND, blocksForPage, railSourceOf, shopPageKind } from '.'
import { PARTNERSHIP_BLOCKS } from './partnership'

const slugs = (blocks: readonly { slug: string }[]) => blocks.map((block) => block.slug)
const offered = (data: Record<string, unknown>) =>
  blocksForPage({ data, id: undefined, req: {} } as never)

describe('the blocks a shop page is offered', () => {
  it('tells the home and the partnership page from any other by address', () => {
    expect(shopPageKind('home')).toBe('home')
    expect(shopPageKind('partnership')).toBe('partnership')
    expect(shopPageKind('stores')).toBe('general')
    expect(shopPageKind(undefined)).toBe('general')
  })

  it('offers the home its blocks and the general ones, and so the partnership page', async () => {
    const general = slugs(CONTENT_BLOCKS)
    expect(await offered({ site: 'shop', slug: 'home' })).toEqual([
      ...slugs(HOME_BLOCKS),
      ...general,
    ])
    expect(await offered({ site: 'shop', slug: 'partnership' })).toEqual([
      ...slugs(PARTNERSHIP_BLOCKS),
      ...general,
    ])
    expect(await offered({ site: 'shop', slug: 'delivery' })).toEqual(general)
  })

  it('offers no home or partnership block to another page', () => {
    for (const slug of [...slugs(HOME_BLOCKS), ...slugs(PARTNERSHIP_BLOCKS)]) {
      expect(BLOCKS_BY_KIND.general, slug).not.toContain(slug)
    }
  })

  it('judges a write without the site or the address by the stored page', async () => {
    const req = { payload: { findByID: async () => ({ site: 'shop', slug: 'home' }) } }
    const blocks = await blocksForPage({ data: { layout: [] }, id: 7, req } as never)
    expect(blocks).toEqual([...BLOCKS_BY_KIND.home])
  })

  it('leaves a gallery page alone', async () => {
    expect(await offered({ site: 'gallery', slug: 'home' })).toBe(true)
  })
})

describe('a products rail’s source', () => {
  it('reads a rail saved before sources as what it showed', () => {
    expect(railSourceOf({ category: 4 })).toBe('category')
    expect(railSourceOf({})).toBe('newest')
    expect(railSourceOf({ source: 'picked', category: 4 })).toBe('picked')
    expect(railSourceOf(null)).toBe('newest')
  })
})
