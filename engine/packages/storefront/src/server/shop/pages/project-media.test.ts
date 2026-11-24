import { describe, expect, it } from 'vitest'

import { projectBlocks } from './project'

const href = (surface: string) => `/${surface}`
const video = {
  id: 41,
  kind: 'video',
  mimeType: 'video/mp4',
  filesize: 2_400_000,
  title: 'The workshop at work',
  description: 'A printer lays a sheet of cotton paper on the press.',
}
const pdf = {
  id: 42,
  kind: 'pdf',
  mimeType: 'application/pdf',
  filesize: 1_200_000,
  title: 'Wholesale price list',
  description: null,
}

describe('a page’s Video and PDF link blocks, projected', () => {
  it('links the file through the public media route, with the record’s words', () => {
    const [shown, link] = projectBlocks(
      [
        { id: 'v', blockType: 'video', video, caption: ' Our press ', anchor: 'film' },
        { id: 'd', blockType: 'documentLink', document: pdf, label: '', note: 'Updated monthly' },
      ],
      href,
    )
    expect(shown).toEqual({
      type: 'video',
      id: 'v',
      anchor: 'film',
      video: {
        url: '/api/x/media/41',
        mimeType: 'video/mp4',
        title: 'The workshop at work',
        description: 'A printer lays a sheet of cotton paper on the press.',
        size: 2_400_000,
      },
      poster: null,
      caption: 'Our press',
    })
    expect(link).toMatchObject({
      type: 'documentLink',
      label: 'Wholesale price list',
      note: 'Updated monthly',
      document: { url: '/api/x/media/42', mimeType: 'application/pdf', size: 1_200_000 },
    })
  })

  it('leaves out a block whose file is missing, of the wrong kind or untitled', () => {
    const blocks = projectBlocks(
      [
        { id: '1', blockType: 'video', video: null },
        { id: '2', blockType: 'video', video: pdf },
        { id: '3', blockType: 'documentLink', document: video },
        { id: '4', blockType: 'documentLink', document: { ...pdf, title: ' ' } },
        { id: '5', blockType: 'documentLink', document: { ...pdf, mimeType: 'text/html' } },
        { id: '6', blockType: 'documentLink', document: 42 },
      ],
      href,
    )
    expect(blocks).toEqual([])
  })
})
