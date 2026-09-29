import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { brandFrom } from './brand'
import { rolesOnlyField, STAFF_ONLY_ACCESS, staffOnly } from './fields'
import { hiddenUnlessModule, moduleEnabled, whenModule } from './modules'
import { siteOrigin, trustedOrigins } from './origins'
import { DRAFTED_ACCESS, PUBLISHED_ONLY, publishedOrStaff } from './published'
import { hasRole, isAdmin, isStaff, rolesOf, staffWithRoles, STAFF_ROLES } from './roles'

type User = Record<string, unknown> | null
const req = (user: User) => ({ req: { user } as unknown as PayloadRequest })
const fieldArgs = (user: User) => req(user) as Parameters<typeof staffOnly>[0]

const anonymous = null
const customer = { id: 7, collection: 'customers', roles: ['admin'] }
const contributor = { id: 1, collection: 'users', roles: ['contributor'] }
const cataloguer = { id: 2, collection: 'users', roles: ['cataloguer', 'editor'] }
const admin = { id: 3, collection: 'users', roles: ['admin'] }

describe('publishedOrStaff', () => {
  it('shows the public published documents only', () => {
    expect(publishedOrStaff(req(anonymous))).toEqual({ _status: { equals: 'published' } })
    expect(PUBLISHED_ONLY).toEqual({ _status: { equals: 'published' } })
  })

  it('treats a signed-in customer as the public, whatever roles it claims', () => {
    expect(publishedOrStaff(req(customer))).toEqual(PUBLISHED_ONLY)
  })

  it('comes with staff-only versions in DRAFTED_ACCESS: a signed-in customer reads no /versions', () => {
    expect(DRAFTED_ACCESS.read).toBe(publishedOrStaff)
    expect(DRAFTED_ACCESS.readVersions(req(customer))).toBe(false)
    expect(DRAFTED_ACCESS.readVersions(req(anonymous))).toBe(false)
    expect(DRAFTED_ACCESS.readVersions(req(contributor))).toBe(true)
  })

  it('shows staff drafts too, whatever their role', () => {
    expect(publishedOrStaff(req(contributor))).toBe(true)
    expect(publishedOrStaff(req(admin))).toBe(true)
  })
})

describe('staffOnly fields', () => {
  it('hides the field from the public and from customers', () => {
    expect(staffOnly(fieldArgs(anonymous))).toBe(false)
    expect(staffOnly(fieldArgs(customer))).toBe(false)
    expect(staffOnly(fieldArgs(contributor))).toBe(true)
  })

  it('guards read, create and update together', () => {
    expect(STAFF_ONLY_ACCESS).toEqual({ create: staffOnly, read: staffOnly, update: staffOnly })
  })

  it('narrows to roles where a field needs it', () => {
    const prices = rolesOnlyField('admin', 'manager')
    expect(prices(fieldArgs(cataloguer))).toBe(false)
    expect(prices(fieldArgs(admin))).toBe(true)
  })
})

describe('roles', () => {
  it('are C1 STAFF_ROLES, seven of them', () => {
    expect(STAFF_ROLES).toEqual([
      'admin',
      'manager',
      'cataloguer',
      'editor',
      'fulfilment',
      'analyst',
      'contributor',
    ])
  })

  it('count only on staff, and only known role names', () => {
    expect(rolesOf(customer)).toEqual([])
    expect(rolesOf({ collection: 'users', roles: ['editor', 'owner', 3] })).toEqual(['editor'])
    expect(hasRole(cataloguer, 'editor')).toBe(true)
    expect(hasRole(cataloguer, 'admin')).toBe(false)
  })

  it('back the collection-level helpers', () => {
    expect(isStaff(req(anonymous))).toBe(false)
    expect(isStaff(req(contributor))).toBe(true)
    expect(isAdmin(req(cataloguer))).toBe(false)
    expect(isAdmin(req(admin))).toBe(true)
    expect(isAdmin(req(customer))).toBe(false)
    expect(staffWithRoles('fulfilment')(req(cataloguer))).toBe(false)
  })
})

describe('module flags', () => {
  const on = () => ({ modules: { 'retention.reviews': true } })
  const off = () => ({ modules: {} })
  const none = () => null

  it('hide a collection and refuse its access while the module is off', () => {
    expect(hiddenUnlessModule('retention.reviews', off)()).toBe(true)
    expect(hiddenUnlessModule('retention.reviews', on)()).toBe(false)
    expect(whenModule('retention.reviews', () => true, off)(req(admin))).toBe(false)
    expect(whenModule('retention.reviews', () => true, on)(req(admin))).toBe(true)
  })

  it('fail closed with no brand loaded (the build, a CLI)', () => {
    expect(moduleEnabled('retention.reviews', none)).toBe(false)
    expect(brandFrom({})).toBeNull()
    expect(brandFrom({ BRAND: '  ' })).toBeNull()
  })
})

describe('trusted origins (CSRF/CORS)', () => {
  const brand = {
    domains: {
      production: 'shop.example',
      staging: 'staging.example',
      aliases: ['www.shop.example'],
    },
  }

  it('are the site origin and the brand hostnames, https, bare, once each', () => {
    expect(trustedOrigins({ SITE_URL: 'https://staging.example/some/path' }, brand)).toEqual([
      'https://staging.example',
      'https://shop.example',
      'https://www.shop.example',
    ])
  })

  it('are empty with no brand and no SITE_URL, and ignore a malformed SITE_URL', () => {
    expect(trustedOrigins({}, null)).toEqual([])
    expect(siteOrigin({ SITE_URL: 'not a url' })).toBeUndefined()
    expect(trustedOrigins({ SITE_URL: 'http://localhost:4167' }, null)).toEqual([
      'http://localhost:4167',
    ])
  })
})
