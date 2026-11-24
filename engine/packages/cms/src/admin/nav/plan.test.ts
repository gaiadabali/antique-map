/**
 * The sidebar's plan (TASKS.md 27.6.b): every collection and global is offered exactly once (or
 * kept off the menu for a better door), under the group its own `admin.group` names; the shop's
 * work is five groups, then the folded technical records and the folded gallery; and each role is
 * offered what its access allows — a store user exactly Orders and Stock by store.
 */
import { describe, expect, it } from 'vitest'

import { registeredCollections, registeredGlobals } from '../../registries/collections'
import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { isCurrent, NAV_PLAN, navSections, OFF_MENU, resolveEntry, TODAY } from './plan'

const asUser = (role: string, store?: number) => ({ collection: 'users', role, store })

/** What Payload's `visibleEntities` holds for a role (each entity's `admin.hidden`). */
function visibleTo(role: string) {
  const user = asUser(role, 3) as never
  const shown = (hidden: unknown) =>
    typeof hidden !== 'function' || !(hidden as (a: unknown) => boolean)({ user })
  return {
    collections: registeredCollections()
      .filter((c) => shown(c.admin?.hidden))
      .map((c) => c.slug),
    globals: registeredGlobals()
      .filter((g) => shown(g.admin?.hidden))
      .map((g) => g.slug),
  }
}

const planned = NAV_PLAN.flatMap((section) =>
  section.entries.flatMap((entry) =>
    entry.kind === 'link' ? [] : [{ group: section.group, kind: entry.kind, slug: entry.slug }],
  ),
)

const menuOf = (role: 'owner' | 'editor' | 'store') =>
  Object.fromEntries(
    navSections(role, visibleTo(role), NAV_PLAN).map((section) => [
      ADMIN_GROUPS[section.group].en,
      section.entries.map((e) => e.href),
    ]),
  )

describe('the sidebar plan', () => {
  it('offers every collection once, under its own group, or keeps it off for a better door', () => {
    for (const collection of registeredCollections()) {
      const rows = planned.filter((p) => p.kind === 'collection' && p.slug === collection.slug)
      if (OFF_MENU.includes(collection.slug)) {
        expect(rows, collection.slug).toHaveLength(0)
        continue
      }
      expect(rows, collection.slug).toHaveLength(1)
      expect(collection.admin?.group, collection.slug).toEqual(ADMIN_GROUPS[rows[0]!.group])
    }
  })

  it('offers every global once, under its own group', () => {
    for (const global of registeredGlobals()) {
      const rows = planned.filter((p) => p.kind === 'global' && p.slug === global.slug)
      expect(rows, global.slug).toHaveLength(1)
      expect(global.admin?.group, global.slug).toEqual(ADMIN_GROUPS[rows[0]!.group])
    }
  })

  it('is five shop groups, then the technical records and the gallery, both folded', () => {
    expect(NAV_PLAN.map((s) => s.group)).toEqual([
      'content',
      'orders',
      'catalogue',
      'stores',
      'settings',
      'technical',
      'gallery',
    ])
    expect(NAV_PLAN.filter((s) => s.folded).map((s) => s.group)).toEqual(['technical', 'gallery'])
  })

  it('offers a store user exactly their orders and their stock, and no home', () => {
    expect(menuOf('store')).toEqual({ Orders: ['/admin/orders'], Stores: ['/admin/stock'] })
    expect(resolveEntry(TODAY, 'store', visibleTo('store'))).toBeNull()
  })

  it('offers an editor no leads, settings or technical records', () => {
    const menu = menuOf('editor')
    expect(Object.keys(menu)).toEqual([
      'Content',
      'Orders',
      'Catalogue',
      'Stores',
      'Settings',
      'Indies Gallery — antiques',
    ])
    expect(menu.Orders).toEqual(['/admin/orders'])
    expect(menu.Settings).toEqual(['/admin/collections/users'])
    expect(menu.Stores).toEqual(['/admin/collections/stores', '/admin/stock'])
  })

  it('offers the owner everything, the home first', () => {
    expect(resolveEntry(TODAY, 'owner', visibleTo('owner'))?.href).toBe('/admin/today')
    expect(menuOf('owner')).toEqual({
      Orders: ['/admin/orders', '/admin/leads', '/admin/collections/partners'],
      Catalogue: [
        '/admin/collections/products',
        '/admin/collections/categories',
        '/admin/collections/themes',
        '/admin/collections/discounts',
      ],
      Stores: ['/admin/collections/stores', '/admin/stock', '/admin/stock-import'],
      Content: [
        '/admin/collections/pages',
        '/admin/collections/articles',
        '/admin/globals/shop-header',
        '/admin/globals/shop-footer',
        '/admin/collections/media',
      ],
      Settings: [
        '/admin/globals/site-settings',
        '/admin/collections/users',
        '/admin/collections/chat-sessions',
      ],
      'Technical records': [
        '/admin/collections/redirects',
        '/admin/collections/order-notifications',
        '/admin/collections/payment-events',
        '/admin/collections/events',
        '/admin/seeds',
      ],
      'Indies Gallery — antiques': [
        '/admin/wall',
        '/admin/collections/works',
        '/admin/collections/makers',
        '/admin/collections/places',
        '/admin/collections/terms',
        '/admin/collections/masters',
      ],
    })
  })

  it('offers nobody signed out anything', () => {
    expect(navSections(null, visibleTo('owner'), NAV_PLAN)).toEqual([])
  })

  it('marks the home current on itself only, any other entry on the pages under it', () => {
    expect(isCurrent('/admin', '/admin')).toBe(true)
    expect(isCurrent('/admin/orders', '/admin')).toBe(false)
    expect(isCurrent('/admin/orders/12', '/admin/orders')).toBe(true)
    expect(isCurrent('/admin/ordersx', '/admin/orders')).toBe(false)
  })
})
