/**
 * The listing URL and the facet state (5.1.b): what the proxy hands a page reads back as the
 * state, every link the page builds is `href()` of a state, and the two round-trip — so a filter
 * the page shows is a filter its URL holds, and one state has one address.
 */
import { createHref, parseListingQuery, parsePublicPath, SITES } from '@engine/config/sites'
import { describe, expect, it } from 'vitest'

import type { PlaceNode } from './places'
import { EMPTY_STATE } from './state'
import { dateOf, listingOfState, stateOfListing } from './url-state'

const href = createHref(SITES.gallery)
const places: readonly PlaceNode[] = [
  { id: 1, slug: 'java', name: 'Java', parentId: null },
  { id: 2, slug: 'batavia', name: 'Batavia', parentId: 1 },
]

/** What the page sees for a public URL: the proxy's internal query, parsed. */
function pageStateOf(url: string) {
  const [path = '', search = ''] = url.split('?')
  const parsed = parsePublicPath(SITES.gallery, path, new URLSearchParams(search))
  if (parsed.kind !== 'surface' || parsed.surface !== 'browse') return null
  const internal = new URLSearchParams(parsed.internal.split('?')[1] ?? '')
  return stateOfListing(parseListingQuery(SITES.gallery.routes, 'browse', internal), places)
}

describe('the browse URL and its state', () => {
  it('reads the type and place path segments and the query facets', () => {
    expect(pageStateOf('/antique-maps/java/batavia?maker=4&availability=sold&date=18')).toEqual({
      ...EMPTY_STATE,
      objectType: ['map'],
      place: 2,
      maker: [4],
      century: 18,
      includeSold: true,
    })
    expect(pageStateOf('/id/peta-antik')?.objectType).toEqual(['map'])
  })

  it('round-trips: a state is read back from its own address', () => {
    const state = {
      ...EMPTY_STATE,
      objectType: ['sea-chart'],
      place: 2,
      subject: [9, 3],
      yearFrom: 1650,
      yearTo: 1720,
      sort: 'dateAsc' as const,
      page: 3,
    }
    const url = href('browse', listingOfState(state, places), 'en')
    expect(url).toBe(
      '/sea-charts/java/batavia?date=1650-1720&subject=3&subject=9&sort=dateAsc&page=3',
    )
    expect(pageStateOf(url)).toEqual({ ...state, subject: [3, 9] })
  })

  it('answers no state for a place path that names no place', () => {
    expect(pageStateOf('/antique-maps/nowhere')).toBeNull()
    expect(pageStateOf('/browse?place=batavia')).toBeNull() // a town without its island
  })

  it('drops what the URL invents rather than guessing', () => {
    expect(pageStateOf('/browse?objectType=spaceship&maker=abc&date=99&sort=priceAsc')).toEqual(
      EMPTY_STATE,
    )
  })

  it('reads the year pair as one value, and the no-JavaScript form’s two bare years', () => {
    expect(dateOf(['1700-1800'])).toEqual({ century: null, yearFrom: 1700, yearTo: 1800 })
    expect(dateOf(['-1800'])).toEqual({ century: null, yearFrom: null, yearTo: 1800 })
    expect(dateOf(['1800', '1700'])).toEqual({ century: null, yearFrom: 1700, yearTo: 1800 })
    expect(dateOf(['18', '1750'])).toEqual({ century: 18, yearFrom: 1750, yearTo: null })
    expect(dateOf(['1900-1800'])).toEqual({ century: null, yearFrom: 1800, yearTo: 1900 })
  })
})
