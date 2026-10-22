import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@engine/cms/instance', () => ({}))
vi.mock('@engine/cms/import', () => ({}))
vi.mock('@engine/cms/seed', () => ({}))
vi.mock('../../../../server/shop/pages/seed/pages', () => ({}))

import { isSeedAction, seedsAllowed, summaryOf } from './runner'

const hosts = (gallery: string, shop: string, nodeEnv = 'production') => ({
  GALLERY_HOSTS: gallery,
  SHOP_HOSTS: shop,
  NODE_ENV: nodeEnv,
})

describe('the seed screen', () => {
  it('runs on staging and on a workstation', () => {
    expect(seedsAllowed(hosts('indies-gallery.gaiada.com', 'old-east-indies.gaiada.com'))).toBe(
      true,
    )
    expect(seedsAllowed(hosts('gallery.localhost', 'shop.localhost', 'development'))).toBe(true)
  })

  it('never runs on the live sites, nor on hosts it cannot place', () => {
    expect(seedsAllowed(hosts('antiquemapsindonesia.com', 'oldeastindies.com'))).toBe(false)
    expect(seedsAllowed(hosts('example.com', 'shop.example.com'))).toBe(false)
    expect(seedsAllowed({})).toBe(false)
  })

  it('knows its four actions and nothing else', () => {
    for (const action of ['vocabulary', 'shop-catalogue', 'shop-pages', 'pictures']) {
      expect(isSeedAction(action)).toBe(true)
    }
    for (const other of ['gallery-full', 'shop', '', null, 1])
      expect(isSeedAction(other)).toBe(false)
  })

  it('shows totals and problems, not one line per row', () => {
    const report = [
      'shop-catalogue-products.csv — products: 1 created, 2 updated, 0 unchanged, 0 rejected, 1 held.',
      'Row 2 (SEED-AP.2033) new.',
      'Row 3 (SEED-AP.2033-M) updated — variants (SEED-AP.2033-M): absent → as the file says',
      'Row 9 (KTA-001 + SEED-X + SEED-X-M) unchanged.',
      'Row 12 (SEED-Y) held — category: no category on record.',
      '',
    ].join('\n')
    expect(summaryOf(report)).toEqual([
      'shop-catalogue-products.csv — products: 1 created, 2 updated, 0 unchanged, 0 rejected, 1 held.',
      'Row 12 (SEED-Y) held — category: no category on record.',
    ])
  })
})
