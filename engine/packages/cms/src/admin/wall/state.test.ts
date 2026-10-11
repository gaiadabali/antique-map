/** The one state tag a card wears, derived from the data alone. */
import { describe, expect, it } from 'vitest'

import { STATE_TAG_WORDS, WALL_COPY } from './copy'
import { thumbnailUrl, thumbnailWidth } from './image'
import { deriveProductState, deriveWorkState } from './state'

const work = { draft: false, hasImage: true, unverifiedAiDrafts: 0, availability: 'available' }
const product = { draft: false, hasImage: true, stock: 3 }

describe('deriveWorkState', () => {
  it('is published for a live, photographed, available work', () => {
    expect(deriveWorkState(work)).toBe('published')
    expect(deriveWorkState({ ...work, availability: 'on-hold' })).toBe('published')
  })

  it('reads a draft as Draft, a sold work as Sold', () => {
    expect(deriveWorkState({ ...work, draft: true })).toBe('draft')
    expect(deriveWorkState({ ...work, availability: 'sold' })).toBe('sold')
  })

  it('names a work with no picture before anything else', () => {
    expect(deriveWorkState({ ...work, hasImage: false, draft: true, unverifiedAiDrafts: 2 })).toBe(
      'needsPhoto',
    )
  })

  it('shows an unverified AI draft above plain Draft', () => {
    expect(deriveWorkState({ ...work, draft: true, unverifiedAiDrafts: 1 })).toBe('aiDraft')
  })
})

describe('deriveProductState', () => {
  it('is published with a picture and a unit somewhere', () => {
    expect(deriveProductState(product)).toBe('published')
  })

  it('is out of stock when the stores’ rows sum to nothing', () => {
    expect(deriveProductState({ ...product, stock: 0 })).toBe('outOfStock')
  })

  it('needs a photo first, then is a draft', () => {
    expect(deriveProductState({ ...product, hasImage: false, draft: true })).toBe('needsPhoto')
    expect(deriveProductState({ ...product, draft: true, stock: 0 })).toBe('draft')
  })
})

describe('thumbnails', () => {
  const media = {
    assetId: 'a'.repeat(32),
    width: 3000,
    derivatives: { status: 'ready' },
    url: '/api/media/file/x.jpg',
  }

  it('uses the 640 rung of the public ladder once derivatives are ready', () => {
    expect(thumbnailUrl(media, 'https://cdn.test/')).toBe(
      `https://cdn.test/derivatives/v1/${'a'.repeat(32)}/640.webp`,
    )
  })

  it('falls back to the record’s own file while derivatives are pending, and to nothing', () => {
    expect(thumbnailUrl({ ...media, derivatives: { status: 'pending' } }, 'https://cdn.test')).toBe(
      '/api/media/file/x.jpg',
    )
    expect(thumbnailUrl(media, '')).toBe('/api/media/file/x.jpg')
    expect(thumbnailUrl({}, 'https://cdn.test')).toBeNull()
    expect(thumbnailUrl(null)).toBeNull()
  })

  it('never points past what the ladder made for a small source', () => {
    expect(thumbnailWidth(500)).toBe(500)
    expect(thumbnailWidth(900)).toBe(640)
    expect(thumbnailWidth(300)).toBe(300)
  })
})

describe('copy', () => {
  it('has both languages for every key and every state', () => {
    for (const pair of [...Object.values(WALL_COPY), ...Object.values(STATE_TAG_WORDS)]) {
      expect(pair.en).not.toBe('')
      expect(pair.id).not.toBe('')
    }
  })
})
