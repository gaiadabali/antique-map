/**
 * The item page's three states (5.2.d): `available` says *Price on request* and asks; `on-hold`
 * wears its badge and still asks; `sold` says **Sold** and nothing else — no Ask button, no
 * price, no "available" wording (EXPERIENCE-GALLERY.md §5, G10, ticket 5.2b). And no state of
 * the whole page shows a figure that reads as a price.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { ItemView } from '../../../server/gallery/item/view-model'
import { AskPanel } from './ask-panel'
import { ItemViewComposition } from './item-view'

const work = (status: ItemView['status']): ItemView => ({
  publicId: 100123,
  workUid: 'IG-0001',
  stockNumber: 'M.0500',
  title: 'Bali by François Valentijn',
  originalTitle: 'Het Eyland Bali',
  originalTitleLanguage: 'nl',
  objectType: 'map',
  maker: { name: 'VALENTIJN, François', role: 'cartographer', certainty: 'attributed' },
  places: [{ name: 'Bali', role: 'depicts', primary: true }],
  date: '1726',
  dimensions: '28.5 × 40 cm (11.2 × 15.7 in)',
  technique: 'copperplate-engraving',
  colouring: 'original-hand',
  status,
  conditionGrade: 'VG+',
  conditionNotes: 'Old folds as issued.',
  conditionDefects: [],
  conditionRestoration: null,
  provenance: [{ holder: 'A private collector, Singapore', period: '1990s', note: null }],
  references: [{ citation: 'Tooley (Australia) 1268', note: null }],
  subjects: ['VOC'],
  images: [
    {
      url: '/media/recto.jpg',
      alt: 'The map of Bali',
      role: 'recto',
      syntheticLabel: null,
      width: 1200,
      height: 900,
      infoUrl: null,
      viewerSrc: '/media/recto.jpg',
      lowResolution: true,
    },
  ],
  primaryIndex: 0,
  slug: 'bali-by-francois-valentijn',
})

const panel = (status: ItemView['status'], locale: 'en' | 'id' = 'en') =>
  renderToStaticMarkup(<AskPanel work={work(status)} locale={locale} askHref="/contact" />)

const page = (status: ItemView['status'], locale: 'en' | 'id' = 'en') =>
  renderToStaticMarkup(
    <ItemViewComposition
      work={work(status)}
      locale={locale}
      askHref="/contact"
      browseHref="/browse"
    />,
  )

/** A figure with a currency sign or code beside it: "$1,200", "USD 18000", "Rp 1.500.000". */
const PRICE_LIKE = /(?:[$€£¥]|\b(?:USD|SGD|IDR|Rp)\b)\s?\d/i

describe('the item page’s three states', () => {
  it('an available work says Price on request and asks about it', () => {
    const html = panel('available')
    expect(html).toContain('Price on request')
    expect(html).toContain('Ask about this')
    expect(html).toContain('href="/contact"')
    expect(html).not.toContain('Sold')
    expect(html).not.toContain('On hold')
  })

  it('an on-hold work wears its badge and still asks', () => {
    const html = panel('on-hold')
    expect(html).toContain('On hold')
    expect(html).toContain('Another buyer is in conversation about this work.')
    expect(html).toContain('Ask to be told if it becomes available')
    expect(html).toContain('href="/contact"')
    expect(html).not.toContain('Sold')
    expect(html).not.toContain('Price on request')
  })

  it('a sold work says Sold and nothing else: no Ask, no price, no "available"', () => {
    const html = panel('sold')
    expect(html).toContain('Sold')
    expect(html).not.toContain('href=')
    expect(html).not.toMatch(/<a\s/)
    expect(html).not.toContain('<button')
    expect(html).not.toContain('Price on request')
    expect(html).not.toMatch(/available/i)
  })

  it('says the states in Indonesian on the Indonesian page', () => {
    expect(panel('sold', 'id')).toContain('Terjual')
    expect(panel('on-hold', 'id')).toContain('Ditahan')
  })
})

describe('the whole item page', () => {
  it.each(['available', 'on-hold', 'sold'] as const)(
    'shows no figure that reads as a price when %s',
    (status) => {
      const html = page(status)
      expect(html).not.toMatch(PRICE_LIKE)
      expect(html).not.toMatch(/askingPrice/i)
    },
  )

  it('a sold page has no Ask link anywhere, only the way back to browse', () => {
    const html = page('sold')
    expect(html).not.toContain('href="/contact"')
    expect(html).toContain('href="/browse"')
  })

  it('says the record in the page’s words, never a code', () => {
    const html = page('available')
    expect(html).toContain('Copperplate engraving')
    expect(html).toContain('Attributed to VALENTIJN, François (Cartographer)')
    expect(html).toContain('Stock no. M.0500')
    expect(html).not.toContain('copperplate-engraving')
  })

  it('renders the zoom door, not the viewer, until the visitor asks', () => {
    const html = page('available')
    expect(html).toContain('Zoom into the image')
    expect(html).not.toContain('openseadragon')
  })
})
