/**
 * `shop-header` and `shop-footer` as the site draws them (TASKS.md 27.5.c): a link to a page, a category, a product
 * or a web address resolves to the shop's address in the visitor's language; a link whose target is
 * missing or unpublished is dropped, never a broken `href`; the announcement shows within its dates,
 * the dates as the owner set them in Bali (Asia/Makassar, UTC+8).
 */
import { describe, expect, it } from 'vitest'

import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import {
  announcementLive,
  announcementOf,
  legalLinksOf,
  linksOf,
  pickedIds,
  shopHrefOf,
  type LinkTargets,
} from './resolve'

const href = createHref(SITES.shop) as (surface: string, params: object, at: SiteLocale) => string
const en = shopHrefOf(href, 'en')
const id = shopHrefOf(href, 'id')

const TARGETS: LinkTargets = {
  pages: new Map([
    [1, { slug: 'privacy', title: 'Privacy' }],
    [2, { slug: 'partnership', title: 'Partnership' }],
    [3, { slug: 'home', title: 'Home' }],
  ]),
  categories: new Map([[10, 'maps']]),
  products: new Map([[20, 'orchid-tree-1863']]),
}

describe('a menu link', () => {
  it('resolves each kind of target to the shop’s address, in each language', () => {
    const rows = [
      { label: 'Privacy', target: 'page', page: 1 },
      { label: 'Partners', target: 'page', page: { id: 2 } },
      { label: 'Maps', target: 'category', category: 10 },
      { label: 'Orchid', target: 'product', product: 20 },
      { label: 'Instagram', target: 'url', url: 'https://instagram.com/oei' },
      { label: 'About', target: 'url', url: '/about' },
    ]
    expect(linksOf(rows, TARGETS, en)).toEqual([
      { label: 'Privacy', href: href('page', { slug: 'privacy' }, 'en'), external: false },
      { label: 'Partners', href: href('partnership', {}, 'en'), external: false },
      { label: 'Maps', href: href('collection', { slug: 'maps' }, 'en'), external: false },
      {
        label: 'Orchid',
        href: href('product', { slug: 'orchid-tree-1863' }, 'en'),
        external: false,
      },
      { label: 'Instagram', href: 'https://instagram.com/oei', external: true },
      { label: 'About', href: '/about', external: false },
    ])
    const [privacy, partners] = linksOf(rows, TARGETS, id)
    expect(privacy?.href).toBe(href('page', { slug: 'privacy' }, 'id'))
    expect(partners?.href).toBe(href('partnership', {}, 'id'))
    expect(partners?.href.startsWith('/id')).toBe(true)
  })

  it('drops a link whose target is missing, unpublished or not an address — never a broken href', () => {
    const rows = [
      { label: 'Gone page', target: 'page', page: 99 },
      { label: 'No page', target: 'page', page: null },
      { label: 'Gone category', target: 'category', category: 98 },
      { label: 'Gone product', target: 'product', product: 97 },
      { label: 'Script', target: 'url', url: 'javascript:alert(1)' },
      { label: 'Elsewhere', target: 'url', url: '//evil.example' },
      { label: 'Plain http', target: 'url', url: 'http://example.com' },
      { label: 'Empty', target: 'url', url: '' },
      { label: 'No target', page: 1 },
      { label: '', target: 'page', page: 1 },
      { label: 'Home', target: 'page', page: 3 },
    ]
    expect(linksOf(rows, TARGETS, en)).toEqual([{ label: 'Home', href: '/', external: false }])
    expect(linksOf(undefined, TARGETS, en)).toEqual([])
  })

  it('labels a legal link by its own words, else the page’s title, and drops a missing page', () => {
    const rows = [{ page: 1 }, { page: 1, label: 'Your data' }, { page: 99 }, {}]
    expect(legalLinksOf(rows, TARGETS, en).map((link) => link.label)).toEqual([
      'Privacy',
      'Your data',
    ])
  })

  it('collects the ids every link picks, in nested columns too', () => {
    const ids = pickedIds(
      { target: 'page', page: 1 },
      [{ target: 'product', product: 20 }],
      [{ label: 'Col', links: [{ target: 'category', category: { id: 10 } }] }],
    )
    expect([...ids.page]).toEqual([1])
    expect([...ids.product]).toEqual([20])
    expect([...ids.category]).toEqual([10])
  })
})

describe('the announcement', () => {
  /** An instant written as the owner reads Bali's clock (Asia/Makassar, UTC+8). */
  const bali = (local: string) => new Date(`${local}+08:00`)

  const stored = (dates: { startsAt?: string; endsAt?: string }) =>
    announcementOf(
      {
        enabled: true,
        text: 'Closed for Nyepi',
        link: { target: 'page', page: 1 },
        ...(dates.startsAt ? { startsAt: bali(dates.startsAt).toISOString() } : {}),
        ...(dates.endsAt ? { endsAt: bali(dates.endsAt).toISOString() } : {}),
      },
      TARGETS,
      en,
    )

  it('is nothing while switched off or without words', () => {
    expect(announcementOf({ enabled: false, text: 'Sale' }, TARGETS, en)).toBeNull()
    expect(announcementOf({ enabled: true, text: '  ' }, TARGETS, en)).toBeNull()
    expect(announcementLive(null, new Date())).toBe(false)
  })

  it('carries its link when the link resolves, and none when it does not', () => {
    expect(stored({})?.link).toEqual({
      href: href('page', { slug: 'privacy' }, 'en'),
      external: false,
    })
    const lost = announcementOf(
      { enabled: true, text: 'Sale', link: { target: 'product', product: 404 } },
      TARGETS,
      en,
    )
    expect(lost).toMatchObject({ text: 'Sale', link: null })
  })

  it('shows from its start to just before its end, Bali time', () => {
    const nyepi = stored({ startsAt: '2027-03-09T00:00:00', endsAt: '2027-03-10T06:00:00' })
    expect(announcementLive(nyepi, bali('2027-03-08T23:59:59'))).toBe(false)
    expect(announcementLive(nyepi, bali('2027-03-09T00:00:00'))).toBe(true)
    // Midnight in Bali is 16:00 the day before in UTC: the window follows the owner's clock.
    expect(announcementLive(nyepi, new Date('2027-03-08T16:00:00Z'))).toBe(true)
    expect(announcementLive(nyepi, bali('2027-03-10T05:59:59'))).toBe(true)
    expect(announcementLive(nyepi, bali('2027-03-10T06:00:00'))).toBe(false)
  })

  it('treats an empty date as open on that side', () => {
    const always = stored({})
    expect(announcementLive(always, bali('2020-01-01T00:00:00'))).toBe(true)
    const until = stored({ endsAt: '2027-01-01T00:00:00' })
    expect(announcementLive(until, bali('2026-12-31T23:59:00'))).toBe(true)
    expect(announcementLive(until, bali('2027-01-01T00:00:00'))).toBe(false)
    const from = stored({ startsAt: '2027-01-01T00:00:00' })
    expect(announcementLive(from, bali('2026-12-31T23:59:00'))).toBe(false)
    expect(announcementLive(from, bali('2030-01-01T00:00:00'))).toBe(true)
  })

  it('ignores a date that is not one', () => {
    const odd = announcementOf(
      { enabled: true, text: 'Sale', startsAt: 'soon', endsAt: null },
      TARGETS,
      en,
    )
    expect(odd).toMatchObject({ startsAt: null, endsAt: null })
    expect(announcementLive(odd, new Date())).toBe(true)
  })
})
