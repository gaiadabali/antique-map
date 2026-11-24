/**
 * The sidebar's own words (TASKS.md 27.6.b): the home link and the working screens that are not a
 * collection or a global — those take their label from their own config. Both languages for every
 * key; the group titles are `../groups.ts`'s.
 */
export const NAV_COPY = {
  navLabel: { en: 'Admin menu', id: 'Menu admin' },
  today: { en: 'Today', id: 'Hari ini' },
  ordersInbox: { en: 'Orders', id: 'Pesanan' },
  leadsInbox: { en: 'Leads inbox', id: 'Kotak masuk calon pembeli' },
  stockMatrix: { en: 'Stock by store', id: 'Stok per toko' },
  imports: { en: 'Import from a spreadsheet', id: 'Impor dari lembar kerja' },
  seeds: { en: 'Load seed data', id: 'Muat data seed' },
  wall: { en: 'Catalogue wall', id: 'Dinding katalog' },
  numbers: { en: 'Sales and visitors', id: 'Penjualan dan pengunjung' },
} as const

export type NavCopyKey = keyof typeof NAV_COPY

export function navText(key: NavCopyKey, language: string | undefined): string {
  return NAV_COPY[key][language === 'id' ? 'id' : 'en']
}
