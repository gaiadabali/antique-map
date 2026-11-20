/**
 * The sidebar groups (TASKS.md 27.6.b; the plan's §3.1). The shop's work in five groups — Orders,
 * Catalogue, Stores, Content, Settings — then the technical records, folded and the owner's alone,
 * and last the gallery's antiques, folded, in one clearly named group: today's one app still
 * serves both sites, and that group leaves with the split (phase 26). Each label is bilingual so
 * the admin stays in one language.
 *
 * Each collection's and global's `admin.group` is one of these, and the sidebar itself
 * (`./nav/plan.ts`) lays the entries out under the same labels, with the working screens (the
 * orders inbox, the stock matrix, the imports) placed among them.
 */
export const ADMIN_GROUPS = {
  orders: { en: 'Orders', id: 'Pesanan' },
  catalogue: { en: 'Catalogue', id: 'Katalog' },
  // Not "Toko" alone: that is also the Stores entry's own name in Indonesian.
  stores: { en: 'Stores', id: 'Toko dan stok' },
  content: { en: 'Content', id: 'Konten' },
  settings: { en: 'Settings', id: 'Pengaturan' },
  technical: { en: 'Technical records', id: 'Catatan teknis' },
  gallery: { en: 'Indies Gallery — antiques', id: 'Indies Gallery — antik' },
} as const

export type AdminGroupKey = keyof typeof ADMIN_GROUPS
