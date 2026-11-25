/**
 * The shop hero: the frame takes the print's shape within 4:5 to 5:4, and every word the hero adds
 * is in both locales — an `en`-only key would show an Indonesian visitor English defaults.
 */
import { describe, expect, it } from 'vitest'

import en from '../lexicon/en.json'
import id from '../lexicon/id.json'

import { windowRatio } from './frame-ratio'

describe('windowRatio', () => {
  it('keeps a print near its own shape', () => {
    expect(windowRatio({ width: 1024, height: 1027 })).toBeCloseTo(0.997, 3)
  })

  it('crops a tall or long sheet to 4:5 or 5:4', () => {
    expect(windowRatio({ width: 600, height: 1200 })).toBe(0.8)
    expect(windowRatio({ width: 3000, height: 1000 })).toBe(1.25)
  })

  it('is square while the size is unknown', () => {
    expect(windowRatio(null)).toBe(1)
    expect(windowRatio({ width: null, height: 800 })).toBe(1)
  })
})

describe('hero words', () => {
  const keys = [
    'home.shop.eyebrow',
    'home.shop.title',
    'home.shop.lede',
    'home.shop.ctaShop',
    'home.shop.ctaProcess',
    'home.shop.heroA',
    'home.shop.pricePrefix',
    'home.shop.signalRestored',
    'home.shop.signalBali',
    'home.shop.signalShops',
  ]

  it.each(keys)('%s is in both locales', (key) => {
    expect(en).toHaveProperty([key])
    expect(id).toHaveProperty([key])
  })
})
