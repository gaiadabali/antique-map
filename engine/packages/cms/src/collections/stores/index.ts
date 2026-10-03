/**
 * `stores` — the physical shops in Bali (CONTENT-MODEL.md §4): each holds stock and sends the
 * orders assigned to it. Fields are `./fields`; where a store is and when it must say, `./pin`.
 *
 * Who reaches it (CONTENT-MODEL.md §7; SECURITY.md §2.2):
 *
 * - the owner manages stores; an editor reads every store; a store user reads their own one, by a
 *   `Where` on its id, so a list, a count or a lookup of another store finds nothing;
 * - the public reads only stores that are **active and listed** — the shop's `/stores` page,
 *   through its loader with `overrideAccess: false` — and never their code, WhatsApp or notes.
 *
 * **Deleting** a store a staff account, a stock row or an order still points at is refused with
 * a plain reason (`./still-used`); the database refuses it too (`./constraints`).
 */
import type { Access, CollectionConfig, Where } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { dbConstraints } from '../../db/constraints'
import { hasRole, isOwner, roleOf, storeOf } from '../users/roles'
import { STORE_CONSTRAINTS } from './constraints'
import { STORE_FIELDS } from './fields'
import { refuseDeleteWhileUsed } from './still-used'

/** What the public may see: a store that takes orders and is listed. */
export const PUBLIC_STORES: Where = {
  and: [{ active: { equals: true } }, { listed: { equals: true } }],
}

/** Owner and editor: every store. Store staff: theirs alone. Anyone else: the public list. */
export const readStores: Access = ({ req }) => {
  if (hasRole(req.user, 'owner', 'editor')) return true
  if (roleOf(req.user) === 'store') {
    const store = storeOf(req.user)
    return store === null ? false : { id: { equals: store } }
  }
  return PUBLIC_STORES
}

export const STORES_ACCESS = {
  read: readStores,
  create: isOwner,
  update: isOwner,
  delete: isOwner,
} as const

export const Stores: CollectionConfig = {
  slug: 'stores',
  labels: {
    singular: { en: 'Store', id: 'Toko' },
    plural: { en: 'Stores', id: 'Toko' },
  },
  admin: {
    group: ADMIN_GROUPS.storesAndStock,
    useAsTitle: 'name',
    defaultColumns: ['code', 'name', 'area', 'active', 'updatedAt'],
    description: {
      en: 'The shops that hold stock and send orders. Each store’s staff see only their own store.',
      id: 'Toko yang menyimpan stok dan mengirim pesanan. Staf setiap toko hanya melihat tokonya sendiri.',
    },
  },
  access: STORES_ACCESS,
  custom: dbConstraints(...STORE_CONSTRAINTS),
  hooks: { beforeDelete: [refuseDeleteWhileUsed] },
  fields: STORE_FIELDS,
}
