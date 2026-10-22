import { describe, expect, it } from 'vitest'

import { nameImages, productImage } from './images'
import type { ProductImage } from './types'

describe('picture names', () => {
  const image = (path: string, kind: ProductImage['kind']): ProductImage =>
    productImage(path, kind, { en: 'x', id: 'x' })

  it('give a second picture of the same name the next number, across products', () => {
    const named = nameImages([
      { nameEn: 'Fly to Java, 1938', images: [image('/d/TP.010.webp', 'artwork')] },
      { nameEn: 'Fly to Java, 1938', images: [image('/d/TP.011.webp', 'artwork')] },
      {
        nameEn: 'Exotic Bali',
        images: [
          image('/i/IG04-5.webp', 'mockup-mounted'),
          image('/i/IG04-6.WEBP', 'mockup-mounted'),
        ],
      },
    ])
    expect(named.flatMap((product) => product.images.map((each) => each.fileName))).toEqual([
      'fly-to-java-1938.webp',
      'fly-to-java-1938-2.webp',
      'exotic-bali-mounted.webp',
      'exotic-bali-mounted-2.webp',
    ])
    expect(named[0]!.images[0]!.legacyFileName).toBe('TP.010.webp')
  })
})
