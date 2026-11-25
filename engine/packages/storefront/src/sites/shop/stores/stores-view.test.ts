import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { areaAnchors, cardOf } from './stores-view'
import { storePhotoFor } from './store-photos'

describe("an area's anchor", () => {
  it('is its name, lower-cased and hyphenated', () => {
    expect(areaAnchors(['Amed', 'Nusa Dua', 'Other areas'])).toEqual([
      'amed',
      'nusa-dua',
      'other-areas',
    ])
  })

  it('drops accents and stays unique on the page', () => {
    expect(areaAnchors(['Tabanan', 'Tábanan', '—'])).toEqual(['tabanan', 'tabanan-2', 'area'])
  })
})

describe("a store card's photograph", () => {
  const base = {
    name: 'Toko Secret',
    area: 'Ubud',
    address: 'Jl. Rahasia 9',
    hours: null,
    mapUrl: 'https://maps.example.test',
  }

  it("uses the store's own image, with its alt, when it has one", () => {
    const card = cardOf(
      {
        ...base,
        image: {
          url: 'https://m.test/a/640.webp',
          alt: 'Front',
          width: 640,
          height: 480,
          srcSet: 'x 320w',
        },
      },
      '0',
    )
    expect(card.photo).toEqual({
      src: 'https://m.test/a/640.webp',
      srcSet: 'x 320w',
      width: 640,
      height: 480,
      alt: 'Front',
    })
  })

  it('falls back to a shared photo, chosen from the name and address, with no alt', () => {
    const card = cardOf({ ...base, image: null }, '0')
    const shared = storePhotoFor('Toko Secret|Jl. Rahasia 9')
    expect(card.photo).toEqual({
      src: shared.src,
      width: shared.width,
      height: shared.height,
      alt: '',
    })
  })

  it('keys the card by its position, never by the store name or address', () => {
    const card = cardOf({ ...base, image: null }, '3', true)
    expect(card.key).toBe('3')
    expect(JSON.stringify(card)).not.toContain('Secret')
    expect(JSON.stringify(card)).not.toContain('Rahasia')
  })
})
