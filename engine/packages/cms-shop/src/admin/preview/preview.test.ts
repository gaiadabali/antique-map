/**
 * The shop page Live Preview (TASKS.md 27.5.a): a phone and a desktop width, and a frame on the
 * shop's own origin that enters the page through `/api/x/preview` — for a shop page alone.
 */
import { describe, expect, it } from 'vitest'

import { Pages } from '../../collections/pages'
import { PREVIEW_BREAKPOINTS, previewUrlOf, shopPagePath, SHOP_PAGE_PREVIEW } from './index'

const SHOP = 'https://old-east-indies.gaiada.com'

describe('the shop page preview', () => {
  it('offers the phone’s 390 and the desktop’s 1280', () => {
    expect(PREVIEW_BREAKPOINTS.map((each) => each.width)).toEqual([390, 1280])
    expect(SHOP_PAGE_PREVIEW.breakpoints?.map((each) => each.width)).toEqual([390, 1280])
  })

  it('is on the pages collection’s edit view', () => {
    expect(Pages.admin?.livePreview).toBe(SHOP_PAGE_PREVIEW)
  })

  it('frames the page through the preview route, on the shop’s origin, in the edited language', () => {
    expect(previewUrlOf({ site: 'shop', slug: 'home' }, 'en', SHOP)).toBe(
      `${SHOP}/api/x/preview?path=%2F`,
    )
    expect(previewUrlOf({ site: 'shop', slug: 'partnership' }, 'id', SHOP)).toBe(
      `${SHOP}/api/x/preview?path=${encodeURIComponent(shopPagePath('partnership', 'id'))}`,
    )
    expect(shopPagePath('about-us', 'en')).toBe('/about-us')
  })

  it('is none for a gallery page, a page without an address, or no shop origin', () => {
    expect(previewUrlOf({ site: 'gallery', slug: 'about' }, 'en', SHOP)).toBeNull()
    expect(previewUrlOf({ site: 'shop', slug: '' }, 'en', SHOP)).toBeNull()
    expect(previewUrlOf({ site: 'shop', slug: 'home' }, 'en', null)).toBeNull()
  })

  it('frames any page with an address in the shop’s own CMS, whose pages carry no site', () => {
    expect(previewUrlOf({ slug: 'home' }, 'en', SHOP, true)).toBe(`${SHOP}/api/x/preview?path=%2F`)
    expect(previewUrlOf({ slug: 'home' }, 'en', SHOP)).toBeNull()
  })
})
