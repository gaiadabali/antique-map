/**
 * The item page's three states (5.2.d): `available` says *Price on request* and asks; `on-hold`
 * wears its badge and still asks; `sold` says **Sold** and nothing else — no Ask-to-buy, no
 * price, no "available" wording anywhere (EXPERIENCE-GALLERY.md §5, G10).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { ItemView } from '../../../server/gallery/item/view-model'
import { AskPanel } from './ask-panel'

const work = (status: ItemView['status']): ItemView => ({
  id: 1,
  publicId: 100123,
  workUid: 'IG-0001',
  stockNumber: 'M.0500',
  title: 'Bali by François Valentijn',
  originalTitle: null,
  originalTitleLanguage: null,
  objectType: 'map',
  maker: null,
  places: [],
  date: '1726',
  dimensions: null,
  technique: null,
  colouring: null,
  status,
  conditionGrade: null,
  conditionNotes: null,
  conditionDefects: [],
  conditionRestoration: null,
  provenance: [],
  references: [],
  subjects: [],
  images: [],
  slug: 'bali-by-francois-valentijn',
})

const markup = (status: ItemView['status']) =>
  renderToStaticMarkup(<AskPanel work={work(status)} locale="en" askHref="/contact" />)

describe("the item page’s three states", () => {
  it('an available work says Price on request and asks about it', () => {
    const html = markup('available')
    expect(html).toContain('Price on request')
    expect(html).toContain('Ask about this')
    expect(html).toContain('href="/contact"')
    // No badge in the happy state.
    expect(html).not.toContain('Sold')
    expect(html).not.toContain('On hold')
  })

  it('an on-hold work wears its badge and still asks', () => {
    const html = markup('on-hold')
    expect(html).toContain('On hold')
    expect(html).toContain('Another buyer is in conversation about this work.')
    expect(html).toContain('Ask to be told if it becomes available')
    expect(html).not.toContain('Sold')
  })

  it('a sold work says Sold and nothing else', () => {
    const html = markup('sold')
    expect(html).toContain('Sold')
    // No price, no "available" wording, no buyer (G10)…
    expect(html).not.toContain('Price on request')
    expect(html).not.toContain('available')
    // …and it still answers for another example, but never a purchase.
    expect(html).toContain('Ask for another example')
  })
})
