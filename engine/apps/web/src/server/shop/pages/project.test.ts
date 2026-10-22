import { describe, expect, it } from 'vitest'

import { hrefOf, paragraphsOf, projectBlocks } from './project'

const href = (surface: string) => `/${surface}`

describe("a shop page's blocks, projected", () => {
  it('resolves a shop page, a section and a web address; refuses anything else', () => {
    expect(hrefOf({ to: 'browse' }, href)).toEqual({ href: '/browse', external: false })
    expect(hrefOf({ to: 'anchor', anchor: 'enquire' }, href)).toEqual({
      href: '#enquire',
      external: false,
    })
    expect(hrefOf({ to: 'url', url: 'https://wa.me/62' }, href)).toEqual({
      href: 'https://wa.me/62',
      external: true,
    })
    expect(hrefOf({ to: 'url', url: '/id/belanja' }, href)).toEqual({
      href: '/id/belanja',
      external: false,
    })
    expect(hrefOf({ to: 'url', url: 'javascript:alert(1)' }, href)).toBeNull()
    expect(hrefOf({ to: 'url', url: '//evil.example' }, href)).toBeNull()
    expect(hrefOf({ to: 'anchor', anchor: 'a b' }, href)).toBeNull()
    expect(hrefOf({ to: 'admin' }, href)).toBeNull()
    expect(hrefOf(undefined, href)).toBeNull()
  })

  it('splits paragraphs on blank lines', () => {
    expect(paragraphsOf('One.\n\n  Two.\n \nThree.')).toEqual(['One.', 'Two.', 'Three.'])
    expect(paragraphsOf(null)).toEqual([])
  })

  it('keeps the order, drops a block it cannot draw and one it does not know', () => {
    const blocks = projectBlocks(
      [
        {
          id: 'a',
          blockType: 'homeHero',
          title: 'Old maps, new walls.',
          lede: '',
          primaryLabel: 'Shop prints',
          primaryLink: { to: 'browse' },
          secondaryLabel: 'How',
          secondaryLink: { to: 'anchor', anchor: 'process' },
          signals: [{ text: 'Printed in Bali' }, { text: ' ' }],
        },
        { id: 'b', blockType: 'story', title: '' },
        { id: 'c', blockType: 'somethingNew', title: 'x' },
        {
          id: 'd',
          blockType: 'steps',
          title: 'How',
          anchor: 'process',
          steps: [{ title: 'One', body: 'First.' }, { title: '' }],
        },
        { id: 'e', blockType: 'productRail', title: 'New', category: { id: 7 } },
      ],
      href,
    )
    expect(blocks.map((block) => `${block.id}:${block.type}`)).toEqual([
      'a:homeHero',
      'd:steps',
      'e:productRail',
    ])
    expect(blocks[0]).toMatchObject({
      lede: null,
      primary: { label: 'Shop prints', href: '/browse' },
      secondary: { label: 'How', href: '#process' },
      signals: ['Printed in Bali'],
    })
    expect(blocks[1]).toMatchObject({ steps: [{ title: 'One', body: 'First.' }] })
    expect(blocks[2]).toMatchObject({ categoryId: 7 })
  })

  it('leaves out a link whose words or address is missing', () => {
    const [cta] = projectBlocks(
      [{ id: 'x', blockType: 'callToAction', title: 'Visit', linkLabel: 'Go', link: {} }],
      href,
    )
    expect(cta).toMatchObject({ type: 'callToAction', link: null })
  })
})
