/**
 * 9.3fix: every page type carries a description, both sites, both locales. Each case reads the
 * very words the page's `generateMetadata` reads (its lexicon key), feeds them through
 * `pageMetadata` and checks the description lands, non-empty, in the Indonesian page's own words.
 */
import { describe, expect, it } from 'vitest'

import type { SiteKey, SiteLocale } from '@engine/config/sites'

import { partnershipText } from '../../app/(shop)/shop/[locale]/partnership/partnership-messages'
import { browseText as galleryBrowseText } from '../../sites/gallery/browse/copy'
import { contactText } from '../../sites/gallery/contact/messages'
import { homeText as galleryHomeText } from '../../sites/gallery/home/home-messages'
import { makerText } from '../../sites/gallery/makers/copy'
import { placeText } from '../../sites/gallery/places/copy'
import { browseText as shopBrowseText } from '../../sites/shop/browse/copy'
import { homeText as shopHomeText } from '../../sites/shop/home/home-messages'
import { productText } from '../../sites/shop/product/copy'
import { pageMetadata, trimDescription } from './metadata'

type Case = {
  readonly site: SiteKey
  readonly page: string
  readonly description: (locale: SiteLocale) => string
}

const CASES: readonly Case[] = [
  { site: 'gallery', page: 'home', description: (l) => galleryHomeText(l)('home.gallery.lede') },
  {
    site: 'gallery',
    page: 'browse',
    description: (l) => galleryBrowseText(l)('browse.description'),
  },
  {
    site: 'gallery',
    page: 'search',
    description: (l) => galleryBrowseText(l)('browse.description'),
  },
  {
    site: 'gallery',
    page: 'maker',
    description: (l) => makerText(l)('makerPage.description', { name: 'Blaeu' }),
  },
  {
    site: 'gallery',
    page: 'maker index',
    description: (l) => makerText(l)('makerPage.indexDescription'),
  },
  {
    site: 'gallery',
    page: 'place',
    description: (l) => placeText(l)('placePage.description', { name: 'Batavia' }),
  },
  {
    site: 'gallery',
    page: 'place index',
    description: (l) => placeText(l)('placePage.indexDescription'),
  },
  { site: 'gallery', page: 'contact', description: (l) => contactText(l)('contact.lede') },
  { site: 'gallery', page: 'sell to us', description: (l) => contactText(l)('sellToUs.lede') },
  { site: 'shop', page: 'home', description: (l) => shopHomeText(l)('home.shop.lede') },
  { site: 'shop', page: 'browse', description: (l) => shopBrowseText(l)('browse.description') },
  { site: 'shop', page: 'search', description: (l) => shopBrowseText(l)('browse.description') },
  { site: 'shop', page: 'collection', description: (l) => shopBrowseText(l)('browse.description') },
  {
    site: 'shop',
    page: 'product (no record text)',
    description: (l) => productText(l)('product.meta'),
  },
  { site: 'shop', page: 'partnership', description: (l) => partnershipText(l)('partnership.lede') },
]

describe('every page type has a description', () => {
  for (const { site, page, description } of CASES) {
    it(`${site} ${page}: a description in both locales, the Indonesian in its own words`, () => {
      const en = description('en')
      const id = description('id')
      expect(en.trim()).not.toBe('')
      expect(id.trim()).not.toBe('')
      expect(id).not.toBe(en)
      for (const locale of ['en', 'id'] as const) {
        const meta = pageMetadata({
          site,
          locale,
          paths: { en: '/x', id: '/id/y' },
          title: 'T',
          description: description(locale),
          origin: 'https://example.test',
        })
        expect(meta.description).toBe(description(locale))
        expect(meta.openGraph?.description).toBe(description(locale))
      }
    })
  }
})

describe('trimDescription', () => {
  it('leaves a short text untouched', () => {
    expect(trimDescription('  A short text. ')).toBe('A short text.')
  })

  it('cuts a long record text at a word, within ~155 characters, with an ellipsis', () => {
    const long = 'word '.repeat(80)
    const cut = trimDescription(long)
    expect(cut.length).toBeLessThanOrEqual(156)
    expect(cut.endsWith('…')).toBe(true)
    expect(cut.endsWith(' …')).toBe(false)
  })
})
