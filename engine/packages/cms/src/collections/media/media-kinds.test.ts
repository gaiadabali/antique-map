/**
 * Media holds images, videos and PDFs (CONTENT-MODEL.md §6): the kind is derived from the file,
 * never typed; an image keeps its intake and its pipeline, a video or a PDF has a title and a
 * description instead; a PDF has its own size cap; a file is held to its declared type; and every
 * relation that needs an image takes images only — the Video and PDF link blocks alone take the
 * others.
 */
import {
  deriveFromFile,
  IMAGES_ONLY,
  PDFS_ONLY,
  refuseMislabelledUpload,
  refuseOversizedUpload,
  showForFile,
  showForImage,
  validateFileDescription,
  validateFileTitle,
  VIDEOS_ONLY,
} from '@engine/cms-core/collections/media'
import { MEDIA_PDF_MAX_BYTES } from '@engine/media/storage'
import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { registeredCollections, registeredGlobals } from '../../registries/collections'
import { Media, MEDIA_FIELDS } from './index'

type Hook = (args: never) => unknown
const call = (hook: Hook, args: Record<string, unknown>) => hook(args as never)
const field = (name: string) =>
  MEDIA_FIELDS.find((f) => 'name' in f && f.name === name) as Record<string, unknown> & {
    admin?: { condition?: (data: unknown) => boolean }
  }
const req = { i18n: { language: 'en' } }

type Found = { readonly path: string; readonly filterOptions: unknown }

/** Every upload field naming `media`, anywhere in a field tree (rows, groups, arrays, blocks). */
function mediaUploads(fields: readonly Field[], path: string, out: Found[] = []): Found[] {
  for (const each of fields) {
    const named = 'name' in each ? `${path}.${each.name}` : path
    if (each.type === 'upload' && each.relationTo === 'media') {
      out.push({ path: named, filterOptions: each.filterOptions })
    }
    if ('fields' in each && Array.isArray(each.fields)) mediaUploads(each.fields, named, out)
    if (each.type === 'tabs') {
      for (const tab of each.tabs) mediaUploads(tab.fields, named, out)
    }
    if (each.type === 'blocks') {
      for (const block of each.blocks) mediaUploads(block.fields, `${named}.${block.slug}`, out)
    }
  }
  return out
}

describe('the kind of a media record', () => {
  it('is named Media in the admin, and lists each record’s kind', () => {
    expect(Media.labels).toEqual({
      singular: { en: 'Media file', id: 'Berkas media' },
      plural: { en: 'Media', id: 'Media' },
    })
    expect(Media.admin?.defaultColumns).toContain('kind')
    expect(field('kind')).toMatchObject({ type: 'select', defaultValue: 'image', index: true })
  })

  it('is derived from the stored type, never from the request', async () => {
    const pdf = (await call(deriveFromFile, {
      data: { mimeType: 'application/pdf', kind: 'image', assetId: 'forged' },
      req: { payloadAPI: 'REST', file: { data: Buffer.from('%PDF-1.7'), size: 8 } },
    })) as Record<string, unknown>
    expect(pdf).toMatchObject({ kind: 'pdf', assetId: null, derivatives: { status: null } })
    const image = (await call(deriveFromFile, {
      data: { mimeType: 'image/png', kind: 'video' },
      req: { payloadAPI: 'REST', file: { data: Buffer.from('png'), size: 3 } },
    })) as Record<string, unknown>
    expect(image).toMatchObject({ kind: 'image', derivatives: { status: 'pending' } })
    expect(image.assetId).toMatch(/^[0-9a-f]{32}$/)
  })

  it('never changes: an image is not replaced by a PDF, nor a video by an image', async () => {
    const replace = (stored: string, next: string) =>
      call(deriveFromFile, {
        data: { mimeType: next },
        originalDoc: { mimeType: stored, kind: 'image' },
        req: { ...req, payloadAPI: 'REST', file: { data: Buffer.from('x'), size: 1 } },
      })
    await expect(replace('image/jpeg', 'application/pdf')).rejects.toThrow()
    await expect(replace('video/mp4', 'image/png')).rejects.toThrow()
    await expect(replace('image/jpeg', 'image/webp')).resolves.toMatchObject({ kind: 'image' })
  })

  it('shows an image’s fields for an image, a video’s or a PDF’s for those, both while unknown', () => {
    for (const name of ['alt', 'subject', 'role', 'provenance', 'master', 'assetId']) {
      const condition = field(name).admin?.condition
      expect(condition, name).toBe(showForImage)
    }
    expect(field('title').admin?.condition).toBe(showForFile)
    expect(showForImage({ mimeType: 'image/avif' })).toBe(true)
    expect(showForImage({ mimeType: 'video/webm' })).toBe(false)
    expect(showForFile({ mimeType: 'application/pdf' })).toBe(true)
    expect(showForFile({ mimeType: 'image/jpeg' })).toBe(false)
    expect(showForImage({})).toBe(true)
    expect(showForFile({})).toBe(true)
  })

  it('asks a PDF and a video for a title, and a video for its description', () => {
    const args = (mimeType: string) => ({ data: { mimeType }, req }) as never
    expect(validateFileTitle('', args('application/pdf'))).toMatch(/title/)
    expect(validateFileTitle(' ', args('video/mp4'))).toMatch(/title/)
    expect(validateFileTitle('', args('image/jpeg'))).toBe(true)
    expect(validateFileTitle('Price list', args('application/pdf'))).toBe(true)
    expect(validateFileDescription('', args('video/webm'))).toMatch(/Describe the video/)
    expect(validateFileDescription('', args('application/pdf'))).toBe(true)
  })
})

describe('what a video or a PDF upload may be', () => {
  const upload = (mimetype: string, data: Buffer, size = data.length) =>
    ({ operation: 'create', req: { ...req, file: { mimetype, data, size } } }) as never

  it('refuses a PDF over its own cap, in words, and lets a video that size through', () => {
    const big = MEDIA_PDF_MAX_BYTES + 1
    expect(() =>
      refuseOversizedUpload(upload('application/pdf', Buffer.from('%PDF-'), big)),
    ).toThrow(
      expect.objectContaining({
        status: 413,
        message: expect.stringMatching(/a PDF may be at most/),
      }),
    )
    expect(() => refuseOversizedUpload(upload('video/mp4', Buffer.from('x'), big))).not.toThrow()
    const indonesian = {
      operation: 'create',
      req: { i18n: { language: 'id' }, file: { mimetype: 'application/pdf', size: big } },
    } as never
    expect(() => refuseOversizedUpload(indonesian)).toThrow(/PDF paling besar/)
  })

  it('refuses a file whose bytes are not the type it was sent as', async () => {
    await expect(
      refuseMislabelledUpload(upload('video/mp4', Buffer.from('%PDF-1.7 a document'))),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      refuseMislabelledUpload(upload('application/pdf', Buffer.from('<html><script>'))),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      refuseMislabelledUpload(upload('application/pdf', Buffer.from('%PDF-1.7'))),
    ).resolves.toBeUndefined()
  })
})

describe('the relations that need an image take images only', () => {
  const uploads = [
    ...registeredCollections().flatMap((c) => mediaUploads(c.fields, c.slug)),
    ...registeredGlobals().flatMap((g) => mediaUploads(g.fields, g.slug)),
  ]

  it('filters every media relation by kind: images, but for the Video and PDF link blocks and an article’s PDF', () => {
    expect(uploads.length).toBeGreaterThan(15)
    for (const { path, filterOptions } of uploads) {
      if (path.endsWith('.video.video')) expect(filterOptions, path).toEqual(VIDEOS_ONLY)
      else if (path.endsWith('.documentLink.document') || path === 'articles.pdf')
        expect(filterOptions, path).toEqual(PDFS_ONLY)
      else expect(filterOptions, path).toEqual(IMAGES_ONLY)
    }
    expect(uploads.map((u) => u.path)).toContain('pages.layout.video.poster')
  })
})
