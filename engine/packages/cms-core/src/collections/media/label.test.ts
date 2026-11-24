/**
 * The media record's admin title (TASKS.md 27.7, `./label`): alt text for an image, the title for a
 * video or a PDF, the file's name when neither is written, one per locale on an all-locale write.
 */
import { describe, expect, it } from 'vitest'

import { mediaCollection } from './index'
import { labelOf } from './label'

describe('the media label', () => {
  it('is an image’s alt text', () => {
    expect(labelOf('image', { alt: ' Batik tote, front ', filename: 'tote.jpg' }, undefined)).toBe(
      'Batik tote, front',
    )
  })

  it('is a video’s or a PDF’s title, not its (empty) alt', () => {
    expect(labelOf('video', { title: 'Our workshop', alt: '' }, undefined)).toBe('Our workshop')
    expect(labelOf('pdf', {}, { title: 'Price list 2027', filename: 'p.pdf' })).toBe(
      'Price list 2027',
    )
  })

  it('falls back to the file’s name', () => {
    expect(labelOf('pdf', { title: '  ' }, { filename: 'list.pdf' })).toBe('list.pdf')
    expect(labelOf('image', {}, undefined)).toBeNull()
  })

  it('is one label per locale on a write in every locale', () => {
    expect(
      labelOf('video', { title: { en: 'Workshop', id: '' }, filename: 'w.mp4' }, undefined),
    ).toEqual({ en: 'Workshop', id: 'w.mp4' })
  })

  it('titles the collection', () => {
    expect(mediaCollection({ group: { en: 'Media', id: 'Media' } }).admin?.useAsTitle).toBe('label')
  })
})
