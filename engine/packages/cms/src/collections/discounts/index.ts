/**
 * `discounts` — codes a buyer types at checkout; at launch, the welcome code (CONTENT-MODEL.md §4;
 * COMMERCE.md §5; TASKS.md 3.3.c — schema and access only, the checkout's use of it is phase 6).
 *
 * - **The owner's alone** (CONTENT-MODEL.md §7): read, create, update, delete. Editors and store
 *   staff see none; the public never reads it — the checkout validates a code on the server.
 * - **`code`** is unique and stored upper-case and trimmed, so matching is case-insensitive.
 * - **`usedCount`** is the server's: incremented atomically in the order's transaction
 *   (`… WHERE used_count < usage_limit`), given back when an order expires or is cancelled; nobody
 *   types it through the API.
 * - **The database** holds the rules a wrong row would cost money on (`./constraints`).
 *
 * Free shipping is a setting (`site-settings`, 3.4), not a discount; the setting names the welcome
 * discount from its side (`site-settings.shop.welcomeDiscount`).
 */
import type { CollectionConfig, FieldAccess, FieldHook } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { dbConstraints } from '../../db/constraints'
import { wholeNumber } from '../products/money'
import { isOwner } from '../users/roles'
import { DISCOUNT_CONSTRAINTS } from './constraints'
import { validateEndsAt, validatePercent, validateUsageLimit } from './rules'

const nobody: FieldAccess = () => false

/** Upper-case and trimmed: `welcome10 ` and `WELCOME10` are one code. */
const normaliseCode: FieldHook = ({ value }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value

export const DISCOUNTS_ACCESS = {
  read: isOwner,
  create: isOwner,
  update: isOwner,
  delete: isOwner,
} as const

export const Discounts: CollectionConfig = {
  slug: 'discounts',
  labels: {
    singular: { en: 'Discount code', id: 'Kode diskon' },
    plural: { en: 'Discount codes', id: 'Kode diskon' },
  },
  admin: {
    group: ADMIN_GROUPS.settings,
    useAsTitle: 'code',
    defaultColumns: ['code', 'kind', 'value', 'active', 'usedCount'],
    description: {
      en: 'Codes buyers type at checkout. A discount applies to the items, never the delivery fee.',
      id: 'Kode yang diketik pembeli saat checkout. Diskon berlaku untuk barang, bukan ongkos kirim.',
    },
  },
  access: DISCOUNTS_ACCESS,
  custom: dbConstraints(...DISCOUNT_CONSTRAINTS),
  fields: [
    {
      name: 'code',
      type: 'text',
      label: { en: 'Code', id: 'Kode' },
      required: true,
      unique: true,
      maxLength: 40,
      hooks: { beforeValidate: [normaliseCode] },
      validate: (value: unknown) =>
        typeof value === 'string' && /^[A-Z0-9][A-Z0-9-]*$/.test(value)
          ? true
          : 'Use letters, digits and hyphens only in a code, such as WELCOME10.',
    },
    {
      name: 'kind',
      type: 'select',
      label: { en: 'Kind', id: 'Jenis' },
      options: [
        { value: 'percent', label: { en: 'Percent off the items', id: 'Persen dari barang' } },
        { value: 'fixed', label: { en: 'Rupiah off the items', id: 'Rupiah dari barang' } },
      ],
      required: true,
    },
    {
      name: 'value',
      type: 'number',
      label: { en: 'Value', id: 'Nilai' },
      required: true,
      validate: validatePercent,
      admin: {
        description: {
          en: 'For a percent code, 1 to 100. For a rupiah code, whole rupiah: 50000 for Rp 50.000.',
          id: 'Untuk kode persen, 1 sampai 100. Untuk kode rupiah, rupiah bulat: 50000 untuk Rp 50.000.',
        },
      },
    },
    {
      name: 'minSpend',
      type: 'number',
      label: { en: 'Minimum spend (Rp)', id: 'Belanja minimum (Rp)' },
      validate: wholeNumber({ min: 0, what: 'The minimum spend' }),
    },
    {
      name: 'oncePerBuyer',
      type: 'checkbox',
      label: { en: 'Once per buyer', id: 'Sekali per pembeli' },
      defaultValue: false,
    },
    {
      type: 'row',
      fields: [
        { name: 'startsAt', type: 'date', label: { en: 'Starts', id: 'Mulai' } },
        {
          name: 'endsAt',
          type: 'date',
          label: { en: 'Ends', id: 'Berakhir' },
          validate: validateEndsAt,
        },
      ],
    },
    {
      name: 'usageLimit',
      type: 'number',
      label: { en: 'Uses allowed', id: 'Batas pemakaian' },
      validate: validateUsageLimit,
    },
    {
      name: 'usedCount',
      type: 'number',
      label: { en: 'Times used', id: 'Sudah dipakai' },
      required: true,
      defaultValue: 0,
      access: { create: nobody, update: nobody },
      admin: { readOnly: true },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: { en: 'Active', id: 'Aktif' },
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
