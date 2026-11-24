/**
 * The originals contract as the shop reads it (TASKS.md 23.5): only the named fields, each checked,
 * so a field the gallery should never send (a price, a note) is dropped, and a malformed answer is
 * no answer.
 */
import { describe, expect, it } from 'vitest'

import { featuredPath, isStockNumber, originalPath, parseFeatured, parseOriginal } from './contract'

const work = {
  stockNumber: 'M.1044',
  title: 'Insulae Iavae',
  url: 'https://gallery.example.test/en/item/12',
  image: { url: 'https://media.example.test/d/640.webp', alt: 'A map', width: 640, height: 480 },
}

describe('the originals contract', () => {
  it('keeps only the named fields of a work', () => {
    const parsed = parseOriginal({ work: { ...work, askingPrice: 9000, notes: 'internal' } })
    expect(parsed).toEqual(work)
    expect(JSON.stringify(parsed)).not.toMatch(/askingPrice|internal/)
  })

  it('is null for a malformed answer, and drops a picture that is not an absolute URL', () => {
    expect(parseOriginal(null)).toBeNull()
    expect(parseOriginal({ work: { ...work, url: 'javascript:alert(1)' } })).toBeNull()
    expect(parseOriginal({ work: { ...work, title: '' } })).toBeNull()
    expect(parseOriginal({ work: { ...work, stockNumber: '../x' } })).toBeNull()
    const relative = { ...work, image: { ...work.image, url: '/api/media/file/x.jpg' } }
    expect(parseOriginal({ work: relative })?.image).toBeNull()
  })

  it('keeps each well-formed, pictured featured work', () => {
    const featured = { title: 'Java', date: '1598', maker: null, url: work.url, image: work.image }
    expect(parseFeatured({ works: [featured, { ...featured, image: null }, 'x'] })).toEqual([
      featured,
    ])
    expect(parseFeatured({})).toEqual([])
  })

  it('accepts stock numbers and builds the paths', () => {
    expect(isStockNumber('P.2863')).toBe(true)
    expect(isStockNumber('featured')).toBe(false)
    expect(isStockNumber('a/b')).toBe(false)
    expect(originalPath('M.1044', 'id')).toBe('/api/x/originals/M.1044?locale=id')
    expect(featuredPath('en')).toBe('/api/x/originals/featured?locale=en')
  })
})
