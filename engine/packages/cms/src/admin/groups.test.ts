/**
 * Static checks for TASKS.md 3.6.b: every registered collection and global is grouped in the
 * sidebar, and each group is one of the named task groups (Antiques, Shop, Stores and stock,
 * Orders, Leads and partners, Content, Settings). Visibility by role is enforced by the
 * collection access functions (TASKS.md 3.5.b); this test only proves the grouping is wired.
 */
import { describe, expect, it } from 'vitest'

import { registeredCollections, registeredGlobals } from '../registries/collections'
import { ADMIN_GROUPS } from './groups'

const GROUP_VALUES = Object.values(ADMIN_GROUPS)

describe('admin sidebar groups', () => {
  for (const collection of registeredCollections()) {
    it(`${collection.slug} belongs to a named group`, () => {
      expect(collection.admin?.group).toBeDefined()
      expect(GROUP_VALUES).toContainEqual(collection.admin!.group)
    })
  }

  for (const global of registeredGlobals()) {
    it(`${global.slug} belongs to the Settings group`, () => {
      expect(global.admin?.group).toEqual(ADMIN_GROUPS.settings)
    })
  }
})
