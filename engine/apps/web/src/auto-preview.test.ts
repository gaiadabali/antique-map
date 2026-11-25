import { describe, expect, it } from 'vitest'

import { autoPreviewWanted } from './auto-preview'

const hosts = (gallery: string, shop: string, extra: Record<string, string> = {}) => ({
  GALLERY_HOSTS: gallery,
  SHOP_HOSTS: shop,
  NODE_ENV: 'production',
  ...extra,
})

describe('the preview seed on its own', () => {
  it('runs on the staging hosts', () => {
    expect(
      autoPreviewWanted(hosts('indies-gallery.gaiada.com', 'old-east-indies.gaiada.com')),
    ).toBe(true)
  })

  it('never on a workstation, in CI, on the live sites or on hosts it cannot place', () => {
    const local = hosts('gallery.localhost', 'shop.localhost', { LOCAL_PRODUCTION_BUILD: '1' })
    expect(autoPreviewWanted(local)).toBe(false)
    expect(autoPreviewWanted(hosts('antiquemapsindonesia.com', 'oldeastindies.com'))).toBe(false)
    expect(autoPreviewWanted({})).toBe(false)
  })

  it('switches off with AUTO_PREVIEW=off', () => {
    const staging = hosts('indies-gallery.gaiada.com', 'old-east-indies.gaiada.com', {
      AUTO_PREVIEW: 'off',
    })
    expect(autoPreviewWanted(staging)).toBe(false)
  })
})
