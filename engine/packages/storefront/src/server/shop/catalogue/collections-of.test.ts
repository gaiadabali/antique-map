import { describe, expect, it } from 'vitest'

import { collectionsOf } from './collections-of'

const image = { url: '/a.webp', alt: 'A', width: 10, height: 10, syntheticLabel: null } as const

describe('collectionsOf', () => {
  it('skips categories with no products and keeps the given order', async () => {
    const counts: Record<string, number> = { maps: 3, empty: 0, birds: 1 }
    const result = await collectionsOf(
      [
        { slug: 'birds', label: 'Birds' },
        { slug: 'empty', label: 'Empty' },
        { slug: 'maps', label: 'Maps' },
      ],
      async (category) => ({
        count: counts[category.slug] ?? 0,
        image: category.slug === 'maps' ? image : null,
      }),
    )
    expect(result.map((each) => each.slug)).toEqual(['birds', 'maps'])
    expect(result[1]).toEqual({ slug: 'maps', label: 'Maps', count: 3, image })
    expect(result[0]?.image).toBeNull()
  })

  it('carries no price', async () => {
    const [one] = await collectionsOf([{ slug: 'a', label: 'A' }], async () => ({
      count: 1,
      image: null,
    }))
    expect(Object.keys(one ?? {}).sort()).toEqual(['count', 'image', 'label', 'slug'])
  })
})
