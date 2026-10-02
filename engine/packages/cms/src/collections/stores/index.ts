/**
 * `stores` — the physical shops in Bali (CONTENT-MODEL.md §4), here at its smallest: the code the
 * store import keys on and the name staff know it by. It exists now so that a `store` user can be
 * given their store (`users.store`, TASKS.md 2.4.b); TASKS.md 3.3.b gives it the rest — address,
 * area, `lat`/`lng`, WhatsApp, hours, images, `active`, notes — and the stock that hangs off it.
 *
 * Who reaches it (CONTENT-MODEL.md §7; SECURITY.md §2.2): the owner manages stores; an editor
 * reads every store; a store user reads their own one, by a `Where` on its id, so a list, a count
 * or a lookup of another store finds nothing. The public never reads this collection directly:
 * the shop's server reads active stores' public fields through its loaders.
 */
import type { Access, CollectionConfig } from 'payload'

import { hasRole, isOwner, storeOf } from '../users/roles'

/** Owner and editor: every store. Store staff: theirs alone. Anyone else: none. */
export const readStores: Access = ({ req }) => {
  if (hasRole(req.user, 'owner', 'editor')) return true
  const store = storeOf(req.user)
  return store === null ? false : { id: { equals: store } }
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
    useAsTitle: 'name',
    defaultColumns: ['code', 'name', 'updatedAt'],
    description: {
      en: 'The shops that hold stock and send orders. Each store’s staff see only their own store.',
      id: 'Toko yang menyimpan stok dan mengirim pesanan. Staf setiap toko hanya melihat tokonya sendiri.',
    },
  },
  access: STORES_ACCESS,
  fields: [
    {
      name: 'code',
      type: 'text',
      label: { en: 'Store code', id: 'Kode toko' },
      required: true,
      unique: true,
      maxLength: 32,
      admin: {
        description: {
          en: 'The code the store list and the stock spreadsheets match on, e.g. UBD-01.',
          id: 'Kode yang dicocokkan oleh daftar toko dan lembar stok, mis. UBD-01.',
        },
      },
    },
    {
      name: 'name',
      type: 'text',
      label: { en: 'Name', id: 'Nama' },
      required: true,
      maxLength: 120,
    },
  ],
}
