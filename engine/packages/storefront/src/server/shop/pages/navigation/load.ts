/**
 * The shop's menu, footer, announcement and logo — the `shop-header` and `shop-footer` globals
 * (TASKS.md 27.5.c; one `shop-navigation` global until 27.6 split it in two menu entries), read
 * together, as one view model, for every shop page's shell.
 *
 * Both are the owner's and editors' globals: no public access through the API. The site reads them on the Local API with `overrideAccess: true` and a `select` of the parts it shows
 * (as `../../../site-settings` reads the contact), at depth 0 — so nothing it links to is read
 * with that access. What a link names is then read the public way: `overrideAccess: false`,
 * published only, the address and title alone. A link to a page, category or product that is not
 * published is dropped (`./resolve`).
 *
 * Cached: `'use cache'`, tagged `settings:shop` (a save of either global expires it), `pages:shop` and
 * `catalogue:shop` (a linked page or product published, renamed or withdrawn), `cacheLife('hours')`
 * as the backstop. The announcement's window is judged by the caller at request time. Called only
 * inside a request (the root layout awaits `connection()` first), so the build never reads it.
 */
import 'server-only'

import { cacheLife } from 'next/cache'
import type { Payload } from 'payload'

import { cacheTags, catalogueTag, pagesTag, settingsTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import { shopOnly } from '@engine/cms-shop/site'
import { PUBLIC_IMAGE_SELECT } from '@engine/site/media/public-image'
import { imageOf } from '../../catalogue/images'
import {
  announcementOf,
  idOf,
  legalLinksOf,
  linksOf,
  pickedIds,
  shopHrefOf,
  type AnnouncementVM,
  type LinkTargets,
  type NavLink,
} from './resolve'

export type { AnnouncementVM, NavLink } from './resolve'

export type ShopNavigationVM = {
  readonly announcement: AnnouncementVM | null
  /** The header's links, in order; empty when the menu is (the shell then draws its own four). */
  readonly menu: readonly NavLink[]
  /** The footer's titled columns, each with at least one link. */
  readonly columns: readonly { readonly title: string; readonly links: readonly NavLink[] }[]
  readonly legal: readonly NavLink[]
  readonly copyright: string | null
  readonly galleryLinkLabel: string | null
  /** The owner's logo files' public addresses, or `null` for the built-in logo. */
  readonly logo: { readonly light: string | null; readonly dark: string | null }
}

export const EMPTY_NAVIGATION: ShopNavigationVM = {
  announcement: null,
  menu: [],
  columns: [],
  legal: [],
  copyright: null,
  galleryLinkLabel: null,
  logo: { light: null, dark: null },
}

type Row = Record<string, unknown>

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

const PUBLISHED = { _status: { equals: 'published' } }

/** What the picked ids are, read the public way. */
async function targetsOf(
  payload: Payload,
  ids: ReturnType<typeof pickedIds>,
  locale: SiteLocale,
): Promise<LinkTargets> {
  const read = async (collection: 'pages' | 'categories' | 'products', set: Set<number>) =>
    set.size === 0
      ? []
      : ((
          await payload.find({
            collection,
            overrideAccess: false,
            where: {
              and: [
                PUBLISHED,
                { id: { in: [...set] } },
                ...[shopOnly(payload, collection) ?? []].flat(),
              ],
            },
            select: collection === 'pages' ? { slug: true, title: true } : { slug: true },
            depth: 0,
            limit: set.size,
            pagination: false,
            locale,
          })
        ).docs as unknown as Row[])
  const [pages, categories, products] = await Promise.all([
    read('pages', ids.page),
    read('categories', ids.category),
    read('products', ids.product),
  ])
  const slugged = (rows: Row[]) =>
    rows.flatMap((row) => {
      const id = idOf(row.id)
      const slug = text(row.slug)
      return id !== null && slug !== null ? [[id, slug] as const] : []
    })
  return {
    pages: new Map(
      pages.flatMap((row) => {
        const id = idOf(row.id)
        const slug = text(row.slug)
        return id !== null && slug !== null
          ? [[id, { slug, title: text(row.title) ?? slug }] as const]
          : []
      }),
    ),
    categories: new Map(slugged(categories)),
    products: new Map(slugged(products)),
  }
}

/** A logo file's public address, read the public way; `null` when it has none yet. */
async function logoUrls(payload: Payload, logo: Row): Promise<ShopNavigationVM['logo']> {
  const ids = [idOf(logo.light), idOf(logo.dark)].filter((id): id is number => id !== null)
  if (ids.length === 0) return { light: null, dark: null }
  const found = await payload.find({
    collection: 'media',
    overrideAccess: false,
    where: { id: { in: ids } },
    select: { ...PUBLIC_IMAGE_SELECT, provenance: true },
    depth: 0,
    limit: ids.length,
    pagination: false,
  })
  const byId = new Map(
    (found.docs as unknown as Row[]).map((row) => [idOf(row.id), imageOf(row)?.url ?? null]),
  )
  const urlOf = (value: unknown) => byId.get(idOf(value)) ?? null
  return { light: urlOf(logo.light), dark: urlOf(logo.dark) }
}

/** The navigation for `locale` from `payload`: the uncached read the loader and the db test share. */
export async function queryShopNavigation(
  payload: Payload,
  locale: SiteLocale,
): Promise<ShopNavigationVM> {
  // Neither global has public access; the parts the shell shows are selected, at depth 0.
  const [header, footer] = await Promise.all([
    payload.findGlobal({
      slug: 'shop-header',
      overrideAccess: true,
      depth: 0,
      locale,
      select: { announcement: true, mainMenu: true, logo: true },
    }),
    payload.findGlobal({
      slug: 'shop-footer',
      overrideAccess: true,
      depth: 0,
      locale,
      select: { footerColumns: true, legalLinks: true, copyright: true, galleryLinkLabel: true },
    }),
  ])
  const doc = { ...(footer as unknown as Row), ...(header as unknown as Row) }
  const columnsRaw = Array.isArray(doc.footerColumns) ? (doc.footerColumns as Row[]) : []
  const ids = pickedIds(
    (doc.announcement as Row | undefined)?.link,
    doc.mainMenu,
    columnsRaw,
    doc.legalLinks,
  )
  const [targets, logo] = await Promise.all([
    targetsOf(payload, ids, locale),
    logoUrls(payload, (doc.logo ?? {}) as Row),
  ])
  const href = shopHrefOf(
    createHref(SITES.shop) as (surface: string, params: object, at: SiteLocale) => string,
    locale,
  )
  return {
    announcement: announcementOf(doc.announcement, targets, href),
    menu: linksOf(doc.mainMenu, targets, href),
    columns: columnsRaw.flatMap((column) => {
      const title = text(column.label)
      const links = linksOf(column.links, targets, href)
      return title !== null && links.length > 0 ? [{ title, links }] : []
    }),
    legal: legalLinksOf(doc.legalLinks, targets, href),
    copyright: text(doc.copyright),
    galleryLinkLabel: text(doc.galleryLinkLabel),
    logo,
  }
}

/**
 * The shop's navigation in `locale`, cached. A read that fails draws the empty navigation (the
 * shell's own links), held for seconds only, so a database that is down never fails a page and
 * never pins the gap for long.
 */
export async function loadShopNavigation(locale: SiteLocale): Promise<ShopNavigationVM> {
  'use cache'
  cacheLife('hours')
  cacheTags([settingsTag('shop'), pagesTag('shop'), catalogueTag('shop')])
  try {
    return await queryShopNavigation(await cms(), locale)
  } catch {
    cacheLife('seconds')
    return EMPTY_NAVIGATION
  }
}
