/**
 * JSON-LD helpers for ticket 9.3a.
 */
import { describe, expect, it } from 'vitest'

import {
  breadcrumbJsonLd,
  jsonLdScript,
  organizationJsonLd,
  productJsonLd,
  workJsonLd,
} from './json-ld'

describe('workJsonLd', () => {
  it('builds a VisualArtwork with the expected fields', () => {
    const ld = workJsonLd({
      title: 'Batavia',
      maker: 'Joan Blaeu',
      year: 1662,
      widthCm: 52,
      heightCm: 38,
      medium: 'Copper engraving',
      places: ['Batavia'],
      stockNumber: 'M.0123',
      image: 'https://antiquemapsindonesia.com/media/batavia.jpg',
      url: 'https://antiquemapsindonesia.com/product/batavia',
    })

    expect(ld['@type']).toBe('VisualArtwork')
    expect(ld.name).toBe('Batavia')
    expect(ld.creator).toEqual({ '@type': 'Person', name: 'Joan Blaeu' })
    expect(ld.dateCreated).toBe('1662')
    expect(ld.identifier).toBe('M.0123')
    expect(ld.image).toBe('https://antiquemapsindonesia.com/media/batavia.jpg')
    expect(ld.url).toBe('https://antiquemapsindonesia.com/product/batavia')
  })

  it("a gallery work's JSON-LD never contains offers or price", () => {
    const ld = workJsonLd({
      title: 'Batavia',
      url: 'https://antiquemapsindonesia.com/product/batavia',
    })
    expect(ld).not.toHaveProperty('offers')
    expect(ld).not.toHaveProperty('price')
    expect(ld).not.toHaveProperty('priceCurrency')
  })

  it('throws when a forbidden field is fed', () => {
    expect(() =>
      workJsonLd({
        title: 'Batavia',
        url: 'https://antiquemapsindonesia.com/product/batavia',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    ).not.toThrow()

    expect(() =>
      workJsonLd({
        title: 'Batavia',
        url: 'https://antiquemapsindonesia.com/product/batavia',
        year: 1662,
      }),
    ).not.toThrow()
  })
})

describe('productJsonLd', () => {
  it('has an IDR offer with an integer price', () => {
    const ld = productJsonLd({
      sku: 'OEI-001',
      name: 'Bali Print',
      image: 'https://oldeastindies.com/media/bali.jpg',
      priceRupiah: 125000,
      inStock: true,
      url: 'https://oldeastindies.com/product/bali-print',
    })

    expect(ld['@type']).toBe('Product')
    expect(ld.sku).toBe('OEI-001')
    expect(ld.brand).toEqual({ '@type': 'Brand', name: 'Old East Indies' })
    expect(ld.offers).toMatchObject({
      '@type': 'Offer',
      priceCurrency: 'IDR',
      price: '125000',
      availability: 'https://schema.org/InStock',
      url: 'https://oldeastindies.com/product/bali-print',
    })
  })

  it('marks out of stock when told', () => {
    const ld = productJsonLd({
      sku: 'OEI-002',
      name: 'Sold Out',
      priceRupiah: 99000,
      inStock: false,
      url: 'https://oldeastindies.com/product/sold-out',
    })
    expect(ld.offers).toMatchObject({
      price: '99000',
      availability: 'https://schema.org/OutOfStock',
    })
  })
})

describe('jsonLdScript', () => {
  it('escapes </script>', () => {
    const script = jsonLdScript({
      '@context': 'https://schema.org',
      '@type': 'Thing',
      name: '</script><script>alert(1)',
    })
    expect(script).not.toContain('</script>')
    expect(script).toContain('\\u003c/script\\u003e')
  })
})

describe('breadcrumbJsonLd', () => {
  it('builds a BreadcrumbList', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Home', url: 'https://antiquemapsindonesia.com/' },
      { name: 'Browse', url: 'https://antiquemapsindonesia.com/browse' },
    ])
    expect(ld['@type']).toBe('BreadcrumbList')
    expect(ld.itemListElement).toHaveLength(2)
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://antiquemapsindonesia.com/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Browse',
        item: 'https://antiquemapsindonesia.com/browse',
      },
    ])
  })
})

describe('organizationJsonLd', () => {
  it('names the gallery', () => {
    const ld = organizationJsonLd('gallery', 'https://antiquemapsindonesia.com')
    expect(ld).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Indies Gallery',
      url: 'https://antiquemapsindonesia.com',
    })
  })
})
