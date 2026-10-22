/**
 * The sidebar groups the admin arranges collections by (TASKS.md 3.6.b; CONTENT-OPERATIONS.md §2).
 * Each group label is bilingual so Payload's locale switch keeps the admin in one language, and
 * says which site a group is for: Gallery (antiques), Shop (products), both (photos and tags).
 * Daily work first, the technical records last: Payload orders groups by where each one's first
 * collection sits in `registries/collections.ts`, so keep that list in this order.
 */
export const ADMIN_GROUPS = {
  antiques: { en: 'Gallery — antiques', id: 'Galeri — antik' },
  // Not "Toko": that is the Stores collection's name in Indonesian, a different group's entry.
  shop: { en: 'Shop — products', id: 'Toko daring — produk' },
  storesAndStock: { en: 'Stores and stock', id: 'Toko dan stok' },
  orders: { en: 'Orders', id: 'Pesanan' },
  leadsAndPartners: { en: 'Leads and partners', id: 'Calon pembeli dan mitra' },
  photosAndTags: { en: 'Photos and tags (both sites)', id: 'Foto dan tag (kedua situs)' },
  content: { en: 'Content', id: 'Konten' },
  settings: { en: 'Settings', id: 'Pengaturan' },
  technical: { en: 'Technical records', id: 'Catatan teknis' },
} as const
