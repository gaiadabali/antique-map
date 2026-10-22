/**
 * The works reader (9.4load): which works become the builder's `WorkLookup`, from an in-memory
 * stand-in for `payload.find`, and the slug the gallery item page derives from a title.
 */
import { describe, expect, it } from 'vitest'

import { slugOf, worksFromDb } from '../works-from-db'
import { fakePayload } from './fake-payload.test-support'

describe('worksFromDb', () => {
  const docs = [
    {
      legacy: { productId: 7 },
      publicId: 100007,
      title: 'Bali by Valentijn',
      _status: 'published',
    },
    { legacy: { productId: 8 }, publicId: 100008, title: 'Java', _status: 'draft' },
    { legacy: { productId: null }, publicId: 100009, title: 'No legacy id', _status: 'published' },
    { legacy: { productId: 10 }, publicId: null, title: 'No public id', _status: 'published' },
    { publicId: 100011, title: 'No legacy group', _status: 'published' },
  ]

  it('keeps works with a legacy id and a public id, published or not, across pages', async () => {
    const works = await worksFromDb(fakePayload([], docs, 2).payload)
    expect(works).toEqual([
      { legacyId: 7, publicId: 100007, slug: 'bali-by-valentijn', published: true },
      { legacyId: 8, publicId: 100008, slug: 'java', published: false },
    ])
  })
})

describe('slugOf', () => {
  it('matches the item page: accents folded, punctuation to hyphens, a fallback for no letters', () => {
    expect(slugOf('Bali by François Valentijn')).toBe('bali-by-francois-valentijn')
    expect(slugOf("Nova Tabula: Insulae Java's")).toBe('nova-tabula-insulae-javas')
    expect(slugOf('地図')).toBe('antique')
  })
  it('cuts a long title at a word boundary', () => {
    const slug = slugOf('word '.repeat(40))
    expect(slug.length).toBeLessThanOrEqual(96)
    expect(slug.endsWith('-')).toBe(false)
  })
})
