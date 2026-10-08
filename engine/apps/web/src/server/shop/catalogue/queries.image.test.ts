/**
 * `imageOf` (6-followup-5): the shop's product image is the public derivative, once the media
 * pipeline has published it, and nothing when it has not — never the staff-only file route
 * (`/api/media/file/…`, 403 to the public) that `publicImageUrl`'s own fallback would answer
 * with otherwise (`../media/public-image`).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { imageOf } from './images'

const BASE = 'https://media.example.test/indies-media'
const ID = '0123456789abcdef0123456789abcdef'
const own = '/api/media/file/product-photo.jpg'

const media = (extra: Record<string, unknown> = {}) => ({
  url: own,
  alt: 'A batik tote',
  width: 640,
  height: 480,
  assetId: ID,
  derivatives: { status: 'ready' },
  ...extra,
})

describe('the shop product image', () => {
  const previous = process.env.MEDIA_PUBLIC_URL
  beforeEach(() => {
    process.env.MEDIA_PUBLIC_URL = BASE
  })
  afterEach(() => {
    if (previous === undefined) delete process.env.MEDIA_PUBLIC_URL
    else process.env.MEDIA_PUBLIC_URL = previous
  })

  it('maps a ready media record to its public derivative', () => {
    expect(imageOf(media())).toEqual({
      srcSet: expect.stringContaining('320.webp 320w'),
      url: `${BASE}/derivatives/v1/${ID}/640.webp`,
      alt: 'A batik tote',
      width: 640,
      height: 480,
      syntheticLabel: null,
    })
  })

  it.each([
    ['rendered', 'digital-mockup'],
    ['composite', 'digital-mockup'],
    ['ai-generated', 'ai-generated'],
    ['photograph', null],
  ])('labels a %s image %s', (provenance, label) => {
    expect(imageOf(media({ provenance }))?.syntheticLabel).toBe(label)
  })

  it('treats a missing or unknown provenance as a photograph', () => {
    expect(imageOf(media())?.syntheticLabel).toBeNull()
    expect(imageOf(media({ provenance: 'mystery' }))?.syntheticLabel).toBeNull()
  })

  it('carries a srcSet of only the rungs that exist for the media', () => {
    const set = imageOf(media({ width: 900, height: 600 }))?.srcSet ?? ''
    const widths = [...set.matchAll(/ (\d+)w/g)].map((m) => Number(m[1]))
    expect(widths.length).toBeGreaterThan(1)
    expect(widths.every((w) => w <= 900)).toBe(true)
    expect(set).toContain(`${BASE}/derivatives/v1/${ID}/320.webp 320w`)
    expect(set).not.toContain('1440')
  })

  it('has no srcSet until the pipeline has run', () => {
    expect(imageOf(media({ derivatives: { status: 'pending' } }))).toBeNull()
  })

  it('is no image — never the staff-only file route — until the pipeline has run', () => {
    expect(imageOf(media({ derivatives: { status: 'pending' } }))).toBeNull()
    expect(imageOf(media({ derivatives: { status: 'failed' } }))).toBeNull()
  })

  it('is null for anything that is not a media record', () => {
    expect(imageOf(null)).toBeNull()
    expect(imageOf(undefined)).toBeNull()
  })
})
