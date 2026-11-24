/**
 * Where a product shows on the shop page's "Shop by" (TASKS.md 28.1; the owner's feedback of
 * 2026-11-19), in the edit screen's sidebar:
 *
 * - **`bestSeller`** — picked by hand (F5: it works before there are sales); the "Best sellers" row
 *   lists the published products with it on.
 * - **`themes`** — any number of the shop's `themes` (Bali, Java, Botanicals…).
 *
 * The product type is the product's `category`; Wall Decor is the categories marked `wallDecor`.
 */
import type { Field } from 'payload'

export const bestSeller: Field = {
  name: 'bestSeller',
  type: 'checkbox',
  label: { en: 'Best seller', id: 'Terlaris' },
  defaultValue: false,
  index: true,
  admin: {
    position: 'sidebar',
    description: {
      en: 'Shown under Best sellers on the shop page.',
      id: 'Ditampilkan di bagian Terlaris pada halaman toko.',
    },
  },
}

export const themes: Field = {
  name: 'themes',
  type: 'relationship',
  relationTo: 'themes',
  hasMany: true,
  label: { en: 'Themes', id: 'Tema' },
  admin: {
    position: 'sidebar',
    allowCreate: false,
    description: {
      en: 'What it shows, such as Bali or Botanicals. Themes are kept under Catalogue → Themes.',
      id: 'Apa yang ditampilkan, mis. Bali atau Botani. Tema dikelola di Katalog → Tema.',
    },
  },
}
