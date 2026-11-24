/**
 * What a `media` upload may be besides an image — an MP4 or WebM video, a PDF — how its kind is
 * told from its type, how its bytes are held to that type, and how the public route reads a range
 * of one from disk without leaving the uploads folder.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  bytesMatchType,
  MEDIA_IMAGE_MIME_TYPES,
  MEDIA_PDF_MAX_BYTES,
  MEDIA_UPLOAD_MAX_BYTES,
  mediaKindOf,
  readUploadRange,
} from './index'

const bytes = (text: string) => new TextEncoder().encode(text)
const MP4 = new Uint8Array([0, 0, 0, 0x18, ...bytes('ftypisom'), 0, 0, 0, 0])
const WEBM = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81])
const PDF = bytes('%PDF-1.7\n%')
const HTML = bytes('<!doctype html><script>')

describe('the kinds of media (images, video, PDF)', () => {
  it('tells the kind from the type, and none for a type no upload may be', () => {
    for (const type of MEDIA_IMAGE_MIME_TYPES) expect(mediaKindOf(type)).toBe('image')
    expect(mediaKindOf('video/mp4')).toBe('video')
    expect(mediaKindOf('video/webm; codecs=vp9')).toBe('video')
    expect(mediaKindOf('application/pdf')).toBe('pdf')
    for (const type of ['image/svg+xml', 'image/tiff', 'text/html', 'video/quicktime', '', null]) {
      expect(mediaKindOf(type)).toBeNull()
    }
  })

  it('caps a PDF well under the overall limit', () => {
    expect(MEDIA_PDF_MAX_BYTES).toBe(20 * 1024 * 1024)
    expect(MEDIA_PDF_MAX_BYTES).toBeLessThan(MEDIA_UPLOAD_MAX_BYTES)
  })

  it('holds a video or a PDF to its bytes, and leaves images to Payload', () => {
    expect(bytesMatchType(MP4, 'video/mp4')).toBe(true)
    expect(bytesMatchType(WEBM, 'video/webm')).toBe(true)
    expect(bytesMatchType(PDF, 'application/pdf')).toBe(true)
    expect(bytesMatchType(PDF, 'video/mp4')).toBe(false)
    expect(bytesMatchType(HTML, 'application/pdf')).toBe(false)
    expect(bytesMatchType(MP4, 'video/webm')).toBe(false)
    expect(bytesMatchType(new Uint8Array(), 'application/pdf')).toBe(false)
    expect(bytesMatchType(HTML, 'image/png')).toBe(true)
  })
})

describe('reading a range of an upload from disk', () => {
  let dir = ''
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'indies-read-range-'))
    await writeFile(join(dir, 'clip.mp4'), bytes('0123456789'))
  })
  afterAll(() => rm(dir, { recursive: true, force: true }))

  const text = async (body: ReadableStream<Uint8Array>) => new Response(body).text()

  it('streams the bytes asked for, inclusive', async () => {
    const read = await readUploadRange({ dir }, 'uploads', 'clip.mp4', { start: 2, end: 5 })
    expect(read?.length).toBe(4)
    expect(await text(read!.body)).toBe('2345')
  })

  it('answers null for a missing file, and for a name that would leave the folder', async () => {
    const range = { start: 0, end: 1 }
    expect(await readUploadRange({ dir }, 'uploads', 'gone.mp4', range)).toBeNull()
    expect(await readUploadRange({ dir }, 'uploads', '../clip.mp4', range)).toBeNull()
    expect(await readUploadRange({ dir }, 'uploads', '..\\clip.mp4', range)).toBeNull()
    expect(await readUploadRange({ dir }, 'uploads', '', range)).toBeNull()
  })
})
