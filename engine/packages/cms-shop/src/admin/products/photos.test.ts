/** The photo uploader's rules: what an upload carries, which files go, and the order. */
import { describe, expect, it } from 'vitest'

import { PRODUCT_IMAGE_DEFAULTS } from '../../collections/media/product-defaults'
import { canUpload, dropIndex, idOf, moved, photoFiles, photoUploadData, refusalOf } from './photos'

describe('photoUploadData', () => {
  it('names a saved product in forProduct, with the name being typed as the alt text', () => {
    expect(photoUploadData({ productId: 12, name: ' Orchid print ' })).toEqual({
      forProduct: 12,
      alt: 'Orchid print',
    })
    expect(photoUploadData({ productId: '12', name: '' })).toEqual({ forProduct: '12' })
  })

  it('carries the product-photo defaults itself before the product is saved', () => {
    expect(photoUploadData({ productId: undefined, name: 'Orchid print' })).toEqual({
      ...PRODUCT_IMAGE_DEFAULTS,
      alt: 'Orchid print',
    })
  })

  it('waits for a saved product or a name', () => {
    expect(canUpload(undefined, '  ')).toBe(false)
    expect(canUpload(null, 'A name')).toBe(true)
    expect(canUpload(4, '')).toBe(true)
  })
})

describe('photoFiles', () => {
  it('keeps the image types the media collection takes', () => {
    const files = [
      { name: 'a.jpg', type: 'image/jpeg' },
      { name: 'b.svg', type: 'image/svg+xml' },
      { name: 'c.webp', type: 'image/webp' },
      { name: 'd.pdf', type: 'application/pdf' },
    ]
    expect(photoFiles(files).map((file) => file.name)).toEqual(['a.jpg', 'c.webp'])
  })
})

describe('ordering', () => {
  it('moves a photo, the first being the cover', () => {
    expect(moved(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moved(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })

  it('ignores a drop on itself or out of range', () => {
    expect(dropIndex(1, 1, 3)).toBeNull()
    expect(dropIndex(0, 3, 3)).toBeNull()
    expect(dropIndex(2, 0, 3)).toBe(0)
  })
})

describe('helpers', () => {
  it('reads an id from a bare or populated value', () => {
    expect(idOf(5)).toBe(5)
    expect(idOf({ id: 'x' })).toBe('x')
    expect(idOf(null)).toBeNull()
    expect(idOf('')).toBeNull()
  })

  it('reads a refusal from Payload’s answer', () => {
    const body = {
      errors: [{ message: 'Bad', data: { errors: [{ message: 'Alt is required' }] } }],
    }
    expect(refusalOf(body, 'x')).toBe('Alt is required')
    expect(refusalOf({ errors: [{ message: 'Too big' }] }, 'x')).toBe('Too big')
    expect(refusalOf(null, 'Failed')).toBe('Failed')
  })
})
