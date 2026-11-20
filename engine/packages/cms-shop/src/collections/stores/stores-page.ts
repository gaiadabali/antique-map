/**
 * How the shop's Stores page groups a store (TASKS.md 28.1; the owner's feedback of 2026-11-19,
 * F4): the flagships first, then the stores by region — Lombok, Ubud, Amed, Canggu, or another
 * region. Both are the owner's to set in the sidebar; the seed marks no store a flagship.
 *
 * `region` is a fixed choice for grouping; the free-text `area` beside the name stays what buyers
 * read on the list and the tracking page (and what the store import fills). Both are public, as
 * the rest of a listed, active store's name and place.
 */
import type { Field } from 'payload'

export const STORE_REGIONS = ['lombok', 'ubud', 'amed', 'canggu', 'other'] as const
export type StoreRegion = (typeof STORE_REGIONS)[number]

export const STORE_REGION_LABELS: Readonly<Record<StoreRegion, { en: string; id: string }>> = {
  lombok: { en: 'Lombok', id: 'Lombok' },
  ubud: { en: 'Ubud', id: 'Ubud' },
  amed: { en: 'Amed', id: 'Amed' },
  canggu: { en: 'Canggu', id: 'Canggu' },
  other: { en: 'Other', id: 'Lainnya' },
}

export const STORES_PAGE_FIELDS: Field[] = [
  {
    name: 'flagship',
    type: 'checkbox',
    label: { en: 'Flagship store', id: 'Toko utama' },
    defaultValue: false,
    admin: {
      position: 'sidebar',
      description: {
        en: 'Shown first on the Stores page, among the flagships.',
        id: 'Ditampilkan paling atas di halaman Toko, bersama toko utama lainnya.',
      },
    },
  },
  {
    name: 'region',
    type: 'select',
    label: { en: 'Region on the Stores page', id: 'Wilayah di halaman Toko' },
    options: STORE_REGIONS.map((value) => ({ value, label: STORE_REGION_LABELS[value] })),
    admin: {
      position: 'sidebar',
      description: {
        en: 'The group the Stores page lists it under. Empty: under Other.',
        id: 'Kelompok tempat toko ini tercantum di halaman Toko. Kosong: di bawah Lainnya.',
      },
    },
  },
]
