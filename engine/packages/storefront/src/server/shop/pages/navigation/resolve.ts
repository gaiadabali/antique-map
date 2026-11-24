/**
 * The header's and footer's links and announcement (`shop-header`, `shop-footer`) as the site
 * draws them (TASKS.md 27.5.c) — pure, so a test drives it with plain rows. A link names a shop page, a category, a product or a web address
 * (`@engine/cms` `globals/shop-links`); the site makes its address in the visitor's
 * language from what the public reads found. A link whose target is missing — a page unpublished,
 * a product deleted, an address that is not one — is dropped: never a broken `href`.
 *
 * The announcement shows while it is on and now is within its dates (either may be empty). The
 * dates are instants: the admin enters them in the editor's own clock (Bali, Asia/Makassar), and
 * the comparison is made at request time, never inside a cache entry.
 */
import type { SiteLocale } from '@engine/config/sites'

/** A resolved link: its words, its address, and whether it leaves the shop. */
export type NavLink = {
  readonly label: string
  readonly href: string
  readonly external: boolean
}

/** The public reads' answer: what each picked record is, published ones only. */
export type LinkTargets = {
  /** A published shop page's address and title, by id. */
  readonly pages: ReadonlyMap<number, { readonly slug: string; readonly title: string }>
  /** A published category's address, by id. */
  readonly categories: ReadonlyMap<number, string>
  /** A published shop product's address, by id. */
  readonly products: ReadonlyMap<number, string>
}

/** How the shop's addresses are made in the visitor's language. */
export type ShopHref = {
  page(slug: string): string
  category(slug: string): string
  product(slug: string): string
}

type Row = Record<string, unknown>

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

/** A relationship read at depth 0 (an id) or populated (`{ id }`). */
export function idOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value
  if (typeof value === 'object' && value !== null) return idOf((value as Row).id)
  return null
}

/** The same rule as the CMS's `LINK_URL`: https, mailto, tel or a path here — never `//elsewhere`. */
const WEB_ADDRESS = /^(https:\/\/[^\s]+|mailto:[^\s]+|tel:\+?[0-9 ]+|\/(?!\/)[^\s]*)$/

/** A stored link (`target` and what it names) → its address, or `null` when it names nothing live. */
export function targetOf(
  link: unknown,
  targets: LinkTargets,
  href: ShopHref,
): { href: string; external: boolean; pageTitle?: string } | null {
  const row = (link ?? {}) as Row
  switch (row.target) {
    case 'page': {
      const id = idOf(row.page)
      const page = id === null ? undefined : targets.pages.get(id)
      return page ? { href: href.page(page.slug), external: false, pageTitle: page.title } : null
    }
    case 'category': {
      const id = idOf(row.category)
      const slug = id === null ? undefined : targets.categories.get(id)
      return slug ? { href: href.category(slug), external: false } : null
    }
    case 'product': {
      const id = idOf(row.product)
      const slug = id === null ? undefined : targets.products.get(id)
      return slug ? { href: href.product(slug), external: false } : null
    }
    case 'url': {
      const url = text(row.url)
      if (url === null || !WEB_ADDRESS.test(url)) return null
      return { href: url, external: url.startsWith('https:') }
    }
    default:
      return null
  }
}

/** A labelled link, or `null` when the label or the target is missing. */
export function linkOf(row: unknown, targets: LinkTargets, href: ShopHref): NavLink | null {
  const label = text((row as Row | null)?.label)
  const target = targetOf(row, targets, href)
  return label && target ? { label, href: target.href, external: target.external } : null
}

/** A list of labelled links, the dropped ones left out, in the order stored. */
export function linksOf(rows: unknown, targets: LinkTargets, href: ShopHref): readonly NavLink[] {
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    const link = linkOf(row, targets, href)
    return link === null ? [] : [link]
  })
}

/** A legal link: a published shop page, labelled by its own label or the page's title. */
export function legalLinksOf(
  rows: unknown,
  targets: LinkTargets,
  href: ShopHref,
): readonly NavLink[] {
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    const target = targetOf({ target: 'page', page: (row as Row)?.page }, targets, href)
    const label = text((row as Row)?.label) ?? target?.pageTitle ?? null
    return target && label ? [{ label, href: target.href, external: false }] : []
  })
}

/** The ids every link in `rows` (and their nested `links`) picks, by kind. */
export function pickedIds(
  ...lists: unknown[]
): Record<'page' | 'category' | 'product', Set<number>> {
  const ids = { page: new Set<number>(), category: new Set<number>(), product: new Set<number>() }
  const visit = (row: unknown) => {
    if (typeof row !== 'object' || row === null) return
    const link = row as Row
    for (const kind of ['page', 'category', 'product'] as const) {
      const id = idOf(link[kind])
      if (id !== null) ids[kind].add(id)
    }
    if (Array.isArray(link.links)) link.links.forEach(visit)
  }
  for (const list of lists) (Array.isArray(list) ? list : [list]).forEach(visit)
  return ids
}

/** The announcement as stored, resolved but not yet judged against the clock. */
export type AnnouncementVM = {
  readonly text: string
  readonly link: { readonly href: string; readonly external: boolean } | null
  /** ISO instants, or `null` for "from now" and "until switched off". */
  readonly startsAt: string | null
  readonly endsAt: string | null
}

/** The stored announcement → what may be shown, or `null` when it is off or has no words. */
export function announcementOf(
  value: unknown,
  targets: LinkTargets,
  href: ShopHref,
): AnnouncementVM | null {
  const row = (value ?? {}) as Row
  const words = text(row.text)
  if (row.enabled !== true || words === null) return null
  const target = targetOf(row.link, targets, href)
  const instant = (at: unknown) => {
    const iso = text(at)
    return iso !== null && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toISOString() : null
  }
  return {
    text: words,
    link: target ? { href: target.href, external: target.external } : null,
    startsAt: instant(row.startsAt),
    endsAt: instant(row.endsAt),
  }
}

/** True while `now` is within the announcement's window: from `startsAt`, until before `endsAt`. */
export function announcementLive(announcement: AnnouncementVM | null, now: Date): boolean {
  if (announcement === null) return false
  const at = now.getTime()
  if (announcement.startsAt !== null && at < Date.parse(announcement.startsAt)) return false
  if (announcement.endsAt !== null && at >= Date.parse(announcement.endsAt)) return false
  return true
}

/** The shop's addresses in `locale`, from the site's `href()`. */
export function shopHrefOf(
  href: (surface: string, params: object, locale: SiteLocale) => string,
  locale: SiteLocale,
): ShopHref {
  const NAMED = new Set(['home', 'partnership', 'stores'])
  return {
    page: (slug) => (NAMED.has(slug) ? href(slug, {}, locale) : href('page', { slug }, locale)),
    category: (slug) => href('collection', { slug }, locale),
    product: (slug) => href('product', { slug }, locale),
  }
}
