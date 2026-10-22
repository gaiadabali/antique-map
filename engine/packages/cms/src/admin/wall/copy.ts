/** The wall's words, keyed, in both admin languages (Indonesian in the Anda register). */
import type { WallStateTag } from './state'

type Pair = { readonly en: string; readonly id: string }

export const WALL_COPY = {
  title: { en: 'Catalogue', id: 'Katalog' },
  today: { en: 'Today’s work', id: 'Pekerjaan hari ini' },
  ordersToAct: { en: 'Orders to act on', id: 'Pesanan perlu tindakan' },
  newLeads: { en: 'New leads', id: 'Calon pembeli baru' },
  aiDrafts: { en: 'AI drafts to check', id: 'Draf AI untuk diperiksa' },
  drafts: { en: 'Drafts', id: 'Draf' },
  numbers: { en: 'See the numbers', id: 'Lihat angka-angkanya' },
  filters: { en: 'Filter the catalogue', id: 'Saring katalog' },
  site: { en: 'Site', id: 'Situs' },
  state: { en: 'State', id: 'Status' },
  siteAll: { en: 'All', id: 'Semua' },
  siteGallery: { en: 'Indies Gallery', id: 'Indies Gallery' },
  siteShop: { en: 'Old East Indies', id: 'Old East Indies' },
  stateAll: { en: 'Everything', id: 'Semua status' },
  stateAttention: { en: 'Needs attention', id: 'Perlu perhatian' },
  stateDrafts: { en: 'Drafts', id: 'Draf' },
  statePublished: { en: 'Published', id: 'Terbit' },
  stateSold: { en: 'Sold or out of stock', id: 'Terjual atau stok habis' },
  onlyAi: {
    en: 'Showing only works with an AI draft to check.',
    id: 'Hanya menampilkan karya dengan draf AI yang perlu diperiksa.',
  },
  showAll: { en: 'Show everything', id: 'Tampilkan semua' },
  searchLabel: { en: 'Search the catalogue', id: 'Cari di katalog' },
  searchHint: { en: 'Title, stock number or SKU', id: 'Judul, nomor stok, atau SKU' },
  search: { en: 'Search', id: 'Cari' },
  wall: { en: 'Records', id: 'Rekaman' },
  gallery: { en: 'Indies Gallery', id: 'Indies Gallery' },
  shop: { en: 'Old East Indies', id: 'Old East Indies' },
  noPhoto: { en: 'No photo', id: 'Tanpa foto' },
  untitled: { en: 'Untitled', id: 'Tanpa judul' },
  prev: { en: 'Newer', id: 'Lebih baru' },
  next: { en: 'Older', id: 'Lebih lama' },
  addWork: { en: 'Add an antique', id: 'Tambah barang antik' },
  addProduct: { en: 'Add a product', id: 'Tambah produk' },
  clear: { en: 'Clear the filters', id: 'Hapus saringan' },
  emptyAttention: {
    en: 'Nothing needs attention: every record is published with a photo.',
    id: 'Tidak ada yang perlu perhatian: setiap rekaman sudah terbit dengan foto.',
  },
  emptyDrafts: {
    en: 'No drafts: everything you have started is published.',
    id: 'Tidak ada draf: semua yang Anda mulai sudah terbit.',
  },
  emptyAi: {
    en: 'No AI drafts are waiting for a check.',
    id: 'Tidak ada draf AI yang menunggu diperiksa.',
  },
  emptySold: {
    en: 'Nothing is sold or out of stock.',
    id: 'Tidak ada yang terjual atau stok habis.',
  },
  emptyPublished: {
    en: 'Nothing is published here yet. Open a draft and publish it, and it appears here.',
    id: 'Belum ada yang terbit di sini. Buka sebuah draf dan terbitkan, maka akan muncul di sini.',
  },
  emptySearch: {
    en: 'No record matches “{q}”. Try part of the title, the stock number or the SKU.',
    id: 'Tidak ada rekaman yang cocok dengan “{q}”. Coba sebagian judul, nomor stok, atau SKU.',
  },
  emptyAll: {
    en: 'The catalogue is empty. Add the first antique or product and it appears here as a card.',
    id: 'Katalog masih kosong. Tambahkan barang antik atau produk pertama, dan ia muncul di sini sebagai kartu.',
  },
  summary: {
    en: '{n} records, newest edit first. Page {page} of {pages}.',
    id: '{n} rekaman, suntingan terbaru di atas. Halaman {page} dari {pages}.',
  },
  summaryOne: {
    en: '1 record. Page 1 of 1.',
    id: '1 rekaman. Halaman 1 dari 1.',
  },
} as const satisfies Record<string, Pair>

export const STATE_TAG_WORDS: Record<WallStateTag, Pair> = {
  needsPhoto: { en: 'Needs photo', id: 'Perlu foto' },
  aiDraft: { en: 'AI draft to check', id: 'Draf AI untuk diperiksa' },
  draft: { en: 'Draft', id: 'Draf' },
  outOfStock: { en: 'Out of stock', id: 'Stok habis' },
  sold: { en: 'Sold', id: 'Terjual' },
  published: { en: 'Published', id: 'Terbit' },
}

export type WallLanguage = 'en' | 'id'
export const languageOf = (value: unknown): WallLanguage => (value === 'id' ? 'id' : 'en')

export function t(key: keyof typeof WALL_COPY, language: WallLanguage): string {
  return WALL_COPY[key][language]
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''))
}
