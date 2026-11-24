/**
 * The admin sidebar's mechanism (TASKS.md 27.6.b; `old-east-indies-cms.md` §3.1), shared by every
 * CMS: a plan is sections of entries — collections, globals and links to working screens — each
 * offered to the roles it names. A CMS writes its own plan (`@engine/cms-shop/admin/nav-plan`; today's
 * one CMS adds the gallery's section, `@engine/cms/admin/nav/plan`), and the sidebar and the home
 * (`./view.jsx`, `../home/view.jsx`) lay it out. Pure: the view hands it the role and what Payload
 * says the person may see (`visibleEntities`, from each collection's `admin.hidden`).
 *
 * The menu is what a person is offered, never what they may do: every read and write is still the
 * collection's access (a store user's orders and stock are their store's because `orders` and
 * `stock-levels` say so).
 */
import type { UserRole } from '../../access'

import type { AdminGroupKey } from '../groups'
import type { NavCopyKey } from './copy'

/** Who an entry is for: everyone on the staff, the catalogue's keepers, the owner. */
export const ALL_STAFF: readonly UserRole[] = ['owner', 'editor', 'store']
export const CATALOGUE: readonly UserRole[] = ['owner', 'editor']
export const OWNER: readonly UserRole[] = ['owner']

export type NavEntry =
  | { readonly kind: 'collection'; readonly slug: string; readonly roles?: readonly UserRole[] }
  | { readonly kind: 'global'; readonly slug: string; readonly roles?: readonly UserRole[] }
  | {
      readonly kind: 'link'
      readonly key: NavCopyKey
      readonly href: string
      readonly roles: readonly UserRole[]
    }

export type NavSection = {
  readonly group: AdminGroupKey
  /** Folded until the person opens it (their choice is then remembered by Payload). */
  readonly folded?: boolean
  readonly entries: readonly NavEntry[]
}

export const collection = (slug: string, roles?: readonly UserRole[]): NavEntry => ({
  kind: 'collection',
  slug,
  ...(roles ? { roles } : {}),
})
export const global = (slug: string): NavEntry => ({ kind: 'global', slug })
export const link = (key: NavCopyKey, href: string, roles: readonly UserRole[]): NavEntry => ({
  kind: 'link',
  key,
  href,
  roles,
})

export type ResolvedEntry = {
  readonly id: string
  readonly href: string
  readonly entry: NavEntry
}

export type ResolvedSection = {
  readonly group: AdminGroupKey
  readonly folded: boolean
  readonly entries: readonly ResolvedEntry[]
}

export type Visible = {
  readonly collections: readonly string[]
  readonly globals: readonly string[]
}

const may = (role: UserRole | null, roles: readonly UserRole[] | undefined) =>
  roles === undefined || (role !== null && roles.includes(role))

/** The entry for this person, or `null` when it is not theirs. */
export function resolveEntry(
  entry: NavEntry,
  role: UserRole | null,
  visible: Visible,
): ResolvedEntry | null {
  if (role === null || !may(role, entry.roles)) return null
  switch (entry.kind) {
    case 'collection':
      return visible.collections.includes(entry.slug)
        ? { id: `nav-${entry.slug}`, href: `/admin/collections/${entry.slug}`, entry }
        : null
    case 'global':
      return visible.globals.includes(entry.slug)
        ? { id: `nav-global-${entry.slug}`, href: `/admin/globals/${entry.slug}`, entry }
        : null
    default:
      return { id: `nav-link-${entry.key}`, href: entry.href, entry }
  }
}

/** The sections this person is offered, in order; a section with nothing for them is left out. */
export function navSections(
  role: UserRole | null,
  visible: Visible,
  plan: readonly NavSection[],
): ResolvedSection[] {
  return plan.flatMap((section) => {
    const entries = section.entries.flatMap((entry) => resolveEntry(entry, role, visible) ?? [])
    return entries.length === 0
      ? []
      : [{ group: section.group, folded: section.folded === true, entries }]
  })
}

/** `/admin` is current only on itself; any other entry also on the pages under it. */
export function isCurrent(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin' || pathname === '/admin/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
