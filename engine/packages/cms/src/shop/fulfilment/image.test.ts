import { describe, expect, it } from 'vitest'

import { checkUpload, reencodeImage, sniffImageType } from './image'
import { EXE, EXIF_JPEG, png, SVG, TEXT } from './image.test-support'

const WEBP_HEAD = Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'latin1')

describe('the driver image: type from the bytes, size from the bytes', () => {
  it('sniffs JPEG, PNG and WebP by their magic numbers', () => {
    expect(sniffImageType(EXIF_JPEG)).toBe('image/jpeg')
    expect(sniffImageType(png(2, 2))).toBe('image/png')
    expect(sniffImageType(WEBP_HEAD)).toBe('image/webp')
  })

  it('refuses an executable, a text file and an SVG whatever they are called', () => {
    for (const bytes of [EXE, TEXT, SVG, Buffer.from('RIFF\0\0\0\0WAVE', 'latin1')]) {
      expect(sniffImageType(bytes)).toBeNull()
      expect(checkUpload(bytes, 1_000_000)).toEqual({ ok: false, refusal: 'not_an_image' })
    }
  })

  it('refuses an empty file and one over the limit, by the bytes received', () => {
    expect(checkUpload(new Uint8Array(0), 10)).toEqual({ ok: false, refusal: 'empty_file' })
    const image = png(4, 4)
    expect(checkUpload(image, image.length - 1)).toEqual({ ok: false, refusal: 'too_large' })
    expect(checkUpload(image, image.length)).toEqual({ ok: true, type: 'image/png' })
  })
})

describe('the driver image: re-encoded by sharp', () => {
  it('drops the Exif — camera and GPS — and writes WebP', async () => {
    expect(EXIF_JPEG.includes('TestCam')).toBe(true)
    const out = await reencodeImage(EXIF_JPEG, 1600)
    const bytes = Buffer.from(out.bytes)
    expect(sniffImageType(bytes)).toBe('image/webp')
    expect(out).toMatchObject({ contentType: 'image/webp', width: 16, height: 12 })
    expect(bytes.includes('Exif')).toBe(false)
    expect(bytes.includes('TestCam')).toBe(false)
  })

  it('brings a large image to 1600 px on its long edge, portrait or landscape', async () => {
    const landscape = await reencodeImage(png(2000, 1000), 1600)
    expect([landscape.width, landscape.height]).toEqual([1600, 800])
    const portrait = await reencodeImage(png(1170, 2532), 1600)
    // 1170 × 1600/2532 = 739.3 px wide; sharp rounds the height to 1599.
    expect([portrait.width, portrait.height]).toEqual([739, 1599])
    const small = await reencodeImage(png(300, 200), 1600)
    expect([small.width, small.height]).toEqual([300, 200])
  }, 60_000)

  it('throws on bytes that start like an image but do not decode', async () => {
    const broken = Buffer.concat([png(4, 4).subarray(0, 20), Buffer.alloc(40)])
    expect(sniffImageType(broken)).toBe('image/png')
    await expect(reencodeImage(broken, 1600)).rejects.toThrow()
  })
})
