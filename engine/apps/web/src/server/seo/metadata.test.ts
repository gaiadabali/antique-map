/**
 * Metadata helpers for ticket 9.3a.
 */
import { describe, expect, it } from 'vitest'

import { pageMetadata, workTitle } from './metadata'

describe('pageMetadata', () => {
  it('canonical and alternates are absolute and use the given origin', () => {
    const meta = pageMetadata({
      site: 'gallery',
      locale: 'en',
      path: '/browse',
      title: 'Browse',
      description: 'A description',
      origin: 'https://antiquemapsindonesia.com',
    })

    expect(meta.alternates?.canonical).toBe('https://antiquemapsindonesia.com/browse')
    expect(meta.alternates?.languages).toMatchObject({
      en: 'https://antiquemapsindonesia.com/browse',
      id: 'https://antiquemapsindonesia.com/id/browse',
      'x-default': 'https://antiquemapsindonesia.com/browse',
    })
    expect(meta.openGraph?.url).toBe('https://antiquemapsindonesia.com/browse')
    expect(meta.metadataBase?.toString()).toBe('https://antiquemapsindonesia.com/')
  })

  it('x-default points at en', () => {
    const meta = pageMetadata({
      site: 'shop',
      locale: 'id',
      path: '/',
      title: 'Home',
      description: 'Shop home',
      origin: 'https://oldeastindies.com',
    })
    expect(meta.alternates?.languages?.['x-default']).toBe('https://oldeastindies.com/')
    expect(meta.alternates?.languages?.en).toBe('https://oldeastindies.com/')
    expect(meta.alternates?.languages?.id).toBe('https://oldeastindies.com/id/')
  })

  it('sets noindex when requested', () => {
    const meta = pageMetadata({
      site: 'gallery',
      locale: 'en',
      path: '/internal',
      title: 'Internal',
      description: '',
      noindex: true,
      origin: 'https://antiquemapsindonesia.com',
    })
    expect(meta.robots).toEqual({ index: false, follow: false })
  })

  it('sets a twitter card from an image', () => {
    const meta = pageMetadata({
      site: 'shop',
      locale: 'en',
      path: '/product/foo',
      title: 'Foo',
      description: 'A product',
      image: { url: '/shop/og.png', alt: 'Foo' },
      origin: 'https://oldeastindies.com',
    })
    expect((meta.twitter as { card?: string }).card).toBe('summary_large_image')
    expect(meta.twitter?.images).toEqual(['/shop/og.png'])
    expect(meta.openGraph?.images).toEqual([{ url: '/shop/og.png', alt: 'Foo' }])
  })
})

describe('workTitle', () => {
  it('formats title with maker and year', () => {
    expect(workTitle('Batavia', 'Joan Blaeu', 1662)).toBe(
      'Batavia – Joan Blaeu, 1662 | Indies Gallery',
    )
  })

  it('omits missing parts', () => {
    expect(workTitle('Batavia')).toBe('Batavia | Indies Gallery')
    expect(workTitle('Batavia', 'Joan Blaeu')).toBe('Batavia – Joan Blaeu | Indies Gallery')
    expect(workTitle('Batavia', undefined, 1662)).toBe('Batavia – 1662 | Indies Gallery')
  })
})
