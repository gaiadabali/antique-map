/**
 * The public's image URL: the largest derivative under C9's key once the pipeline has published it
 * — never wider than the ladder's top rung — else the record's own (staff-only) file.
 */
import { describe, expect, it } from 'vitest'

import {
  derivativeSrcSetOf,
  derivativeUrlOf,
  derivativeWidthsOf,
  largestDerivativeWidth,
  publicImageUrl,
} from './public-image'

const BASE = 'https://media.example.test/indies-media'
const ID = '0123456789abcdef0123456789abcdef'
const own = '/api/media/file/M-0500_recto_01.jpg'

const media = (extra: Record<string, unknown> = {}) => ({
  url: own,
  width: 640,
  assetId: ID,
  derivatives: { status: 'ready' },
  ...extra,
})

describe('the public image URL', () => {
  it('is the largest derivative once the pipeline has published it', () => {
    expect(publicImageUrl(media(), BASE)).toBe(`${BASE}/derivatives/v1/${ID}/640.webp`)
    expect(publicImageUrl(media({ width: 6000 }), BASE)).toBe(
      `${BASE}/derivatives/v1/${ID}/2400.webp`,
    )
    expect(largestDerivativeWidth(2400)).toBe(2400)
    expect(largestDerivativeWidth(2399)).toBe(2399)
  })

  it('falls back to the record’s own file until then, or with no public base', () => {
    expect(publicImageUrl(media({ derivatives: { status: 'pending' } }), BASE)).toBe(own)
    expect(publicImageUrl(media({ derivatives: { status: 'failed' } }), BASE)).toBe(own)
    expect(publicImageUrl(media({ assetId: '../../uploads/x' }), BASE)).toBe(own)
    expect(publicImageUrl(media({ width: null }), BASE)).toBe(own)
    expect(publicImageUrl(media(), '')).toBe(own)
    expect(derivativeUrlOf(media(), '')).toBeNull()
  })

  it('is null for a record with no file at all', () => {
    expect(publicImageUrl({ url: '', derivatives: { status: 'pending' } }, BASE)).toBeNull()
  })
})

describe('the derivative ladder as a srcset', () => {
  it('names the widths the pipeline made, as derivativeWidthsFor() does', () => {
    expect(derivativeWidthsOf(300)).toEqual([300])
    expect(derivativeWidthsOf(700)).toEqual([320, 640, 700])
    expect(derivativeWidthsOf(2000)).toEqual([320, 640, 1024, 1600, 2000])
    expect(derivativeWidthsOf(2400)).toEqual([320, 640, 1024, 1600, 2400])
    expect(derivativeWidthsOf(9000)).toEqual([320, 640, 1024, 1600, 2400])
  })

  it('lists every rung with its width, the top one the URL the public is shown', () => {
    const srcSet = derivativeSrcSetOf(media({ width: 1200 }), BASE)
    expect(srcSet).toBe(
      [320, 640, 1024, 1200].map((w) => `${BASE}/derivatives/v1/${ID}/${w}.webp ${w}w`).join(', '),
    )
    expect(srcSet).toContain(`${publicImageUrl(media({ width: 1200 }), BASE)} 1200w`)
  })

  it('is null until the pipeline has published the derivatives', () => {
    expect(derivativeSrcSetOf(media({ derivatives: { status: 'pending' } }), BASE)).toBeNull()
    expect(derivativeSrcSetOf(media({ assetId: '../../uploads/x' }), BASE)).toBeNull()
    expect(derivativeSrcSetOf(media({ width: null }), BASE)).toBeNull()
    expect(derivativeSrcSetOf(media(), '')).toBeNull()
  })
})
