/**
 * Static checks for TASKS.md 3.6.b and 27.6.b: every registered collection and global is grouped,
 * each group is one of the named groups (Orders, Catalogue, Stores, Content, Settings, Technical
 * records, Indies Gallery), and the menu a role sees is the menu its access allows (`admin.hidden` is built from the same role helpers, `./hidden`). Access still enforces the
 * reads; these tests prove the menu agrees with it.
 */
import { describe, expect, it } from 'vitest'

import { registeredCollections, registeredGlobals } from '../registries/collections'
import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'

const GROUP_VALUES = Object.values(ADMIN_GROUPS)

/** Kept out of the sidebar (`group: false`, routes intact): orders' door is the inbox (TASKS.md 27.3.a). */
const OFF_SIDEBAR = new Set(['orders'])

/** A signed-in `users` document, as `admin.hidden` receives it. */
const asUser = (role: string, store?: number) => ({ collection: 'users', role, store })

function visibleTo(user: unknown): Set<string> {
  const visible = new Set<string>()
  for (const collection of registeredCollections()) {
    const hidden = collection.admin?.hidden
    if (typeof hidden !== 'function' || !hidden({ user: user as never })) {
      visible.add(collection.slug)
    }
  }
  for (const global of registeredGlobals()) {
    const hidden = global.admin?.hidden
    if (typeof hidden !== 'function' || !hidden({ user: user as never })) {
      visible.add(global.slug)
    }
  }
  return visible
}

describe('admin sidebar groups', () => {
  for (const collection of registeredCollections()) {
    it(`${collection.slug} belongs to a named group`, () => {
      if (OFF_SIDEBAR.has(collection.slug)) {
        expect(collection.admin?.group).toBe(false)
        return
      }
      expect(collection.admin?.group).toBeDefined()
      expect(GROUP_VALUES).toContainEqual(collection.admin!.group)
    })
  }

  for (const global of registeredGlobals()) {
    it(`${global.slug} belongs to Settings or, the shop's header and footer, Content`, () => {
      expect([ADMIN_GROUPS.settings, ADMIN_GROUPS.content]).toContainEqual(global.admin?.group)
    })
  }

  it('every collection and global carries an admin.hidden rule', () => {
    for (const collection of registeredCollections()) {
      expect(collection.admin?.hidden, collection.slug).toBeTypeOf('function')
    }
    for (const global of registeredGlobals()) {
      expect(global.admin?.hidden, global.slug).toBeTypeOf('function')
    }
  })

  it("a store user's visible collections are exactly orders, stores and stock-levels", () => {
    expect(visibleTo(asUser('store', 3))).toEqual(new Set(['orders', 'stores', 'stock-levels']))
  })

  it('an editor does not see leads, partners, chat-sessions, events or site-settings', () => {
    const visible = visibleTo(asUser('editor'))
    for (const slug of ['leads', 'partners', 'chat-sessions', 'events', 'site-settings']) {
      expect(visible.has(slug), slug).toBe(false)
    }
    expect(visible).toContain('works')
    expect(visible).toContain('orders')
  })

  it('the owner sees everything the admin offers', () => {
    expect(visibleTo(asUser('owner'))).toEqual(
      new Set([
        ...registeredCollections().map((c) => c.slug),
        ...registeredGlobals().map((g) => g.slug),
      ]),
    )
  })
})
