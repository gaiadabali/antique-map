import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { rolesOnlyField, STAFF_ONLY_ACCESS, staffOnly } from './fields'
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
