/**
 * The seven sidebar groups the admin arranges collections by (TASKS.md 3.6.b;
 * CONTENT-OPERATIONS.md §2). Each group label is bilingual so Payload's locale
 * switch keeps the admin in one language.
 */
export const ADMIN_GROUPS = {
  antiques: { en: 'Antiques', id: 'Antik' },
  shop: { en: 'Shop', id: 'Toko' },
  storesAndStock: { en: 'Stores and stock', id: 'Toko dan stok' },
  orders: { en: 'Orders', id: 'Pesanan' },
  leadsAndPartners: { en: 'Leads and partners', id: 'Calon pembeli dan mitra' },
  content: { en: 'Content', id: 'Konten' },
  settings: { en: 'Settings', id: 'Pengaturan' },
} as const
