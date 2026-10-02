// Access as it reads a request (DR-10, SECURITY.md §2.2): the owner and the editors keep the
// catalogue and alone see drafts, /versions and staff-only fields; a store user may enter the
// admin but is never catalogue staff; anything else is the public. Each case plants the user that
// must be refused, so the test fails if a helper lets it through.
import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { STAFF_ONLY_ACCESS, staffOnly } from './fields'
import {
  hasRole,
  isCatalogueStaff,
  isOwner,
  isStaff,
  isStaffUser,
  ownerOnlyField,
  rolesOnlyField,
  staffWithRoles,
  USER_ROLES,
} from './index'
import { siteOrigin, trustedOrigins } from './origins'
import { DRAFTED_ACCESS, PUBLISHED_ONLY, publishedOrStaff } from './published'

type User = Record<string, unknown> | null
const req = (user: User) => ({ req: { user } as unknown as PayloadRequest })
const fieldArgs = (user: User) => req(user) as Parameters<typeof staffOnly>[0]

const anonymous = null
const owner = { id: 1, collection: 'users', role: 'owner' }
const editor = { id: 2, collection: 'users', role: 'editor' }
const store = { id: 3, collection: 'users', role: 'store', store: 7 }
/** A users document whose role is missing or no known one: fails closed. */
const roleless = { id: 4, collection: 'users' }
const unknownRole = { id: 5, collection: 'users', role: 'admin' }
/** An account of another collection claiming the owner's role. */
const outsider = { id: 6, collection: 'customers', role: 'owner' }
const PUBLIC = [anonymous, store, roleless, unknownRole, outsider]

describe('who keeps the catalogue: the owner and the editors, never store staff', () => {
  it('isCatalogueStaff / isStaff take the owner and an editor', () => {
    for (const user of [owner, editor]) {
      expect(isCatalogueStaff(user)).toBe(true)
      expect(isStaff(req(user))).toBe(true)
    }
  })

  it('refuses a store user, a user with no known role and another collection’s account', () => {
    for (const user of PUBLIC) {
      expect(isCatalogueStaff(user), JSON.stringify(user)).toBe(false)
      expect(isStaff(req(user)), JSON.stringify(user)).toBe(false)
    }
  })

  it('still lets a store user enter the admin: isStaffUser is a users document, nothing more', () => {
    expect(isStaffUser(store)).toBe(true)
    expect(isStaffUser(roleless)).toBe(true)
    expect(isStaffUser(outsider)).toBe(false)
    expect(isStaffUser(anonymous)).toBe(false)
  })
})

describe('drafts: publishedOrStaff and DRAFTED_ACCESS', () => {
  it('show the owner and an editor drafts', () => {
    expect(publishedOrStaff(req(owner))).toBe(true)
    expect(publishedOrStaff(req(editor))).toBe(true)
    expect(DRAFTED_ACCESS.readVersions(req(editor))).toBe(true)
  })

  it('give a store user, the public and an outsider the published documents only, and no /versions', () => {
    for (const user of PUBLIC) {
      expect(publishedOrStaff(req(user)), JSON.stringify(user)).toEqual(PUBLISHED_ONLY)
      expect(DRAFTED_ACCESS.readVersions(req(user)), JSON.stringify(user)).toBe(false)
    }
    expect(PUBLISHED_ONLY).toEqual({ _status: { equals: 'published' } })
    expect(DRAFTED_ACCESS.read).toBe(publishedOrStaff)
  })
})

describe('staff-only fields: staffOnly and STAFF_ONLY_ACCESS', () => {
  it('open to the owner and an editor', () => {
    expect(staffOnly(fieldArgs(owner))).toBe(true)
    expect(staffOnly(fieldArgs(editor))).toBe(true)
  })

  it('closed to a store user (media.master, translationStatus) and everyone outside', () => {
    for (const user of PUBLIC) {
      for (const [operation, access] of Object.entries(STAFF_ONLY_ACCESS)) {
        expect(access(fieldArgs(user)), `${operation} ${JSON.stringify(user)}`).toBe(false)
      }
    }
  })

  it('guard read, create and update together', () => {
    expect(STAFF_ONLY_ACCESS).toEqual({ create: staffOnly, read: staffOnly, update: staffOnly })
  })
})

describe('the role vocabulary, re-exported from the users collection', () => {
  it('is owner, editor and store, one per person', () => {
    expect(USER_ROLES).toEqual(['owner', 'editor', 'store'])
    expect(hasRole(store, 'store')).toBe(true)
    expect(hasRole(outsider, 'owner')).toBe(false)
    expect(hasRole(unknownRole, 'owner')).toBe(false)
  })

  it('backs the owner-only and role-narrowed helpers', () => {
    expect(isOwner(req(owner))).toBe(true)
    expect(isOwner(req(editor))).toBe(false)
    expect(ownerOnlyField(fieldArgs(owner))).toBe(true)
    expect(ownerOnlyField(fieldArgs(store))).toBe(false)
    expect(rolesOnlyField('owner', 'editor')(fieldArgs(store))).toBe(false)
    expect(staffWithRoles('store')(req(store))).toBe(true)
    expect(staffWithRoles('store')(req(editor))).toBe(false)
  })
})

describe('trusted origins (CSRF/CORS) and the server URL', () => {
  const STAGING = {
    GALLERY_HOSTS: 'indies-gallery.gaiada.com,www.indies-gallery.gaiada.com',
    SHOP_HOSTS: 'old-east-indies.gaiada.com',
  }

  it('list each site’s canonical origin, https, bare, once each — never an alias', () => {
    expect(trustedOrigins(STAGING)).toEqual([
      'https://indies-gallery.gaiada.com',
      'https://old-east-indies.gaiada.com',
    ])
  })

  it('admit the shop’s origin as well as the gallery’s (2.1 found POST /api/works refused from shop.localhost)', () => {
    const local = { GALLERY_HOSTS: 'gallery.localhost', SHOP_HOSTS: 'shop.localhost', PORT: '4167' }
    expect(trustedOrigins(local)).toEqual([
      'http://gallery.localhost:4167',
      'http://shop.localhost:4167',
    ])
  })

  it('pin serverURL to the admin host: the shop’s canonical host unless ADMIN_HOST names the other', () => {
    expect(siteOrigin(STAGING)).toBe('https://old-east-indies.gaiada.com')
    expect(siteOrigin({ ...STAGING, ADMIN_HOST: 'indies-gallery.gaiada.com' })).toBe(
      'https://indies-gallery.gaiada.com',
    )
  })

  it('are empty with no usable allow-list (the build, a CLI), and ignore SITE_URL and a brand', () => {
    expect(trustedOrigins({})).toEqual([])
    expect(siteOrigin({})).toBeUndefined()
    expect(trustedOrigins({ SITE_URL: 'https://evil.example.com' }, { domains: {} })).toEqual([])
    expect(trustedOrigins({ ...STAGING, ADMIN_HOST: 'evil.example.com' })).toEqual([])
    expect(siteOrigin({ ...STAGING, ADMIN_HOST: 'evil.example.com' })).toBeUndefined()
  })
})
