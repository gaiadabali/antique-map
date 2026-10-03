/**
 * The search page's states (5.1.b): a miss hands the visitor to the gallery's own WhatsApp and
 * email — the Ask us handoff from the site settings, never a price — results render as the same
 * cards the browse page shows, and a near miss says one "Did you mean".
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { SearchResultVM, WorkCardVM } from '../../../server/gallery/catalogue/view-models'
import { SearchView, type SearchContact } from './search-view'

const work: WorkCardVM = {
  id: 1,
  title: 'A view of the castle of Batavia',
  maker: { name: 'François Valentijn', certainty: 'certain' },
  place: null,
  objectType: 'map',
  date: '1719',
  dimensions: null,
  status: 'available',
  image: null,
  publicId: 100001,
  workUid: null,
  stockNumber: null,
}

const NO_CONTACT: SearchContact = { whatsapp: null, email: null }

const render = (result: SearchResultVM, contact: SearchContact = NO_CONTACT) =>
  renderToStaticMarkup(
    <SearchView
      query="batavia"
      includeSold={false}
      result={result}
      locale="en"
      contact={contact}
    />,
  )

describe('the search page', () => {
  it("the search page's no-results state offers the Ask us handoff", () => {
    const markup = render(
      { items: [], total: 0, suggestion: null, jumpTo: null },
      { whatsapp: '+62 812 3456 7890', email: 'gallery@indiesgallery.example' },
    )
    expect(markup).toContain('Nothing matches “batavia”')
    expect(markup).toContain('Ask us about “batavia”')
    // The handoff is the gallery's own WhatsApp and email, the words carried in the message.
    expect(markup).toContain('href="https://wa.me/6281234567890?text=batavia"')
    expect(markup).toContain('href="mailto:gallery@indiesgallery.example?subject=batavia"')
    expect(markup).toContain('Ask by email')
    expect(markup).not.toMatch(/price|Rp/i)
  })

  it('a query with results shows the cards and the count, and no handoff', () => {
    const markup = render({ items: [work], total: 1, suggestion: null, jumpTo: null })
    expect(markup).toContain('A view of the castle of Batavia')
    expect(markup).toContain('href="/product/100001"')
    expect(markup).toContain('1 work')
    expect(markup).not.toContain('wa.me')
    expect(markup).not.toContain('Ask us')
  })

  it('a near miss says one "Did you mean", a link that searches the name', () => {
    const markup = render({
      items: [],
      total: 0,
      suggestion: { kind: 'maker', label: 'François Valentijn' },
      jumpTo: null,
    })
    expect(markup.match(/Did you mean/g)?.length).toBe(1)
    expect(markup).toContain('Did you mean François Valentijn?')
    expect(markup).toContain('href="/search?q=Fran%C3%A7ois%20Valentijn"')
  })

  it('a place found by its old name suggests the old name the visitor nearly typed', () => {
    const markup = render({
      items: [],
      total: 0,
      suggestion: { kind: 'place', label: 'Sulawesi', historical: 'Celebes' },
      jumpTo: null,
    })
    expect(markup).toContain('Did you mean Celebes?')
  })
})
