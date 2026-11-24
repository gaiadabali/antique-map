/** The "Today" home's words (TASKS.md 27.6.a), keyed, in both admin languages (Anda register). */
type Pair = { readonly en: string; readonly id: string }

export const TODAY_COPY = {
  title: { en: 'Today', id: 'Hari ini' },
  intro: {
    en: 'What needs you now in Old East Indies. Each card opens its work.',
    id: 'Yang perlu Anda kerjakan sekarang di Old East Indies. Setiap kartu membuka pekerjaannya.',
  },
  ordersTitle: { en: 'Orders to act on', id: 'Pesanan perlu tindakan' },
  tab_needs_action: { en: 'Need action', id: 'Perlu tindakan' },
  tab_processing: { en: 'Being packed', id: 'Sedang dikemas' },
  tab_waiting_driver: { en: 'Waiting for a driver', id: 'Menunggu pengemudi' },
  tab_on_the_way: { en: 'On the way', id: 'Dalam perjalanan' },
  catalogueTitle: { en: 'Stock and catalogue', id: 'Stok dan katalog' },
  lowStock: { en: 'Low stock (at {n} or under)', id: 'Stok menipis ({n} atau kurang)' },
  draftProducts: { en: 'Products in draft', id: 'Produk masih draf' },
  draftPages: { en: 'Pages in draft', id: 'Halaman masih draf' },
  peopleTitle: { en: 'Leads and sales', id: 'Calon pembeli dan penjualan' },
  newLeads: { en: 'New leads', id: 'Calon pembeli baru' },
  sales: { en: 'Sales, last 7 days', id: 'Penjualan, 7 hari terakhir' },
  salesOrders: { en: '{n} paid orders', id: '{n} pesanan dibayar' },
  salesOrder: { en: '1 paid order', id: '1 pesanan dibayar' },
  unknown: { en: 'Could not be read just now', id: 'Belum bisa dibaca' },
  wall: {
    en: 'All products and antiques as cards: the catalogue wall',
    id: 'Semua produk dan barang antik sebagai kartu: dinding katalog',
  },
} as const satisfies Record<string, Pair>

export type TodayKey = keyof typeof TODAY_COPY

export function tt(
  key: TodayKey,
  language: string | undefined,
  vars: Record<string, string | number> = {},
) {
  const text = TODAY_COPY[key][language === 'id' ? 'id' : 'en']
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''))
}
