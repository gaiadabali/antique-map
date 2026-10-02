/**
 * `users.role` and `users.store` (CONTENT-MODEL.md §6; DR-10). One role per person (`./roles`),
 * and for a `store` user the one store they work in — required for that role and empty for the
 * others (`./store-rule`).
 *
 * Both are saved to the session token so access checks read them without a query, and only the
 * owner sets them (field access, SECURITY.md R7): a member of staff cannot grant themselves more,
 * or move themselves to another store. The first user's and the last owner's cases are the
 * collection's hooks (`./guards`).
 *
 * The default says what will happen: `owner` while nobody has an account — the create-first-user
 * screen would otherwise offer "Editor" for an account the hook then makes an owner — and
 * `editor` for everyone after. A function default reaches neither the DDL nor the types.
 */
import type { Field, PayloadRequest } from 'payload'

import { USERS_SLUG } from '../../access/roles'
import { DEFAULT_ROLE, ownerOnlyField, ROLE_LABELS, USER_ROLES, type UserRole } from './roles'

export async function defaultRole(req: PayloadRequest): Promise<UserRole> {
  const { totalDocs } = await req.payload.count({
    collection: USERS_SLUG,
    overrideAccess: true,
    req,
  })
  return totalDocs === 0 ? 'owner' : DEFAULT_ROLE
}

const OWNER_SETS_IT = { create: ownerOnlyField, update: ownerOnlyField } as const

export const roleField: Field = {
  name: 'role',
  type: 'select',
  label: { en: 'Role', id: 'Peran' },
  required: true,
  index: true,
  defaultValue: ({ req }: { req: PayloadRequest }) => defaultRole(req),
  saveToJWT: true,
  options: USER_ROLES.map((role) => ({ label: ROLE_LABELS[role], value: role })),
  access: OWNER_SETS_IT,
  admin: {
    description: {
      en: 'Owner: everything, including staff, stores, settings, leads and partners. Editor: the catalogue, the content and every order. Store staff: their own store’s orders and stock only.',
      id: 'Pemilik: semuanya, termasuk staf, toko, pengaturan, prospek, dan mitra. Editor: katalog, konten, dan semua pesanan. Staf toko: hanya pesanan dan stok tokonya sendiri.',
    },
  },
}

export const storeField: Field = {
  name: 'store',
  type: 'relationship',
  relationTo: 'stores',
  label: { en: 'Store', id: 'Toko' },
  index: true,
  saveToJWT: true,
  access: OWNER_SETS_IT,
  admin: {
    condition: (data) => (data as { role?: unknown } | undefined)?.role === 'store',
    description: {
      en: 'The one store this person works in. Required for store staff; other roles have none.',
      id: 'Satu toko tempat orang ini bekerja. Wajib untuk staf toko; peran lain tidak memilikinya.',
    },
  },
}
