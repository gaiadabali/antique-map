/**
 * The browse page's controls (5.1.b): an applied filter is a chip that clears itself — one chip
 * per filter, each a real link — and a card shows one status line and never a price (the gallery
 * sells by enquiry; EXPERIENCE-GALLERY.md §4).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { PlaceNode } from '../../../server/gallery/catalogue/places'
import { EMPTY_STATE, type FacetState } from '../../../server/gallery/catalogue/state'
import type { WorkCardVM } from '../../../server/gallery/catalogue/view-models'
import { AppliedFilters, chipsOf } from './applied-filters'
import { FacetsPanel } from './facets-panel'
import { WorkCard } from './work-card'

const state = (over: Partial<FacetState> = {}): FacetState => ({ ...EMPTY_STATE, ...over })

const places: readonly PlaceNode[] = [
  { id: 1, slug: 'java', name: 'Java', parentId: null },
  { id: 2, slug: 'batavia', name: 'Batavia', parentId: 1 },
]

const chips = (over: Partial<FacetState>) =>
  chipsOf({ state: state(over), facets: [], places, locale: 'en' })

describe('the applied-filter chips', () => {
  it('the browse page shows applied-filter chips that clear the filter', () => {
    const markup = renderToStaticMarkup(
      <AppliedFilters
        state={state({ objectType: ['map'], place: 2, century: 17, includeSold: true })}
        facets={[]}
        places={places}
        locale="en"
      />,
    )
    // One chip per applied filter, named in the lexicon's words, each a link…
    for (const label of ['Map', 'Batavia', '17th century', 'Include sold']) {
      expect(markup).toContain(`aria-label="Remove ${label}"`)
    }
    expect(markup).toContain('Clear all')

    // …that clears exactly its own filter, to the route map's canonical address.
    expect(chips({ objectType: ['map'] })[0]?.clearHref).toBe('/browse')
    expect(chips({ objectType: ['map'], place: 2 }).map((chip) => chip.clearHref)).toEqual([
      '/browse?place=java%2Fbatavia',
      '/antique-maps',
    ])
    expect(chips({ yearFrom: 1700, yearTo: 1800 })[0]).toMatchObject({
      label: '1700–1800',
      clearHref: '/browse',
    })
  })

  it('a page with no filters shows no chips at all', () => {
    expect(
      renderToStaticMarkup(
        <AppliedFilters state={state()} facets={[]} places={places} locale="en" />,
      ),
    ).toBe('')
  })

  it('names the chips in Indonesian on the Indonesian site', () => {
    const [chip] = chipsOf({ state: state({ century: 18 }), facets: [], places, locale: 'id' })
    expect(chip?.label).toBe('Abad ke-18')
    expect(chip?.clearHref).toBe('/id/jelajah')
  })
})

describe('the facet panel', () => {
  it('shows a zero option and links every option to its own address', () => {
    const markup = renderToStaticMarkup(
      <FacetsPanel
        state={state()}
        facets={[
          {
            key: 'objectType',
            options: [
              { value: 'map', label: '', count: 3, applied: false },
              { value: 'atlas', label: '', count: 0, applied: false },
            ],
            places: [],
            range: { from: null, to: null },
          },
        ]}
        places={places}
        locale="en"
        idPrefix="column"
      />,
    )
    expect(markup).toContain('href="/antique-maps"')
    // The zero is shown, not hidden (EXPERIENCE-GALLERY.md §9).
    expect(markup).toMatch(/Atlas<\/span><span[^>]*>0</)
  })
})

describe('the work card', () => {
  const work: WorkCardVM = {
    id: 1,
    title: 'A view of the castle of Batavia',
    maker: { name: 'François Valentijn', certainty: 'certain' },
    place: null,
    objectType: 'map',
    date: 'c. 1726',
    dimensions: '28 × 36 cm (11 × 14.2 in)',
    status: 'sold',
    image: null,
    publicId: 100001,
    workUid: null,
    stockNumber: null,
  }

  it('a card shows one status line and no price', () => {
    const markup = renderToStaticMarkup(<WorkCard work={work} locale="en" href="/product/100001" />)
    expect(markup).toContain('A view of the castle of Batavia')
    expect(markup).toContain('François Valentijn, c. 1726')
    expect(markup).toContain('28 × 36 cm')
    // One status line, and never a price: no amount, no currency, no second line beside it.
    expect(markup.match(/Sold/g)?.length).toBe(1)
    expect(markup).not.toMatch(/Rp|S\$|SGD|IDR|\$\s?\d/)
    expect(markup).not.toContain('Price on request')
    // The card is one link, by the item's publicId route.
    expect(markup.match(/<a /g)?.length).toBe(1)
    expect(markup).toContain('href="/product/100001"')
  })

  it('an available work says price on request instead of naming one', () => {
    const markup = renderToStaticMarkup(
      <WorkCard work={{ ...work, status: 'available' }} locale="en" href="/product/100001" />,
    )
    expect(markup).toContain('Price on request')
    expect(markup).not.toContain('Sold')
  })
})
