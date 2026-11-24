/**
 * Copy for the stock matrix (TASKS.md 27.4.b). Every key is bilingual (AGENTS.md: "Copy lives in
 * keyed lexicon files, never in components"); `{n}`-style holes are filled by `L`'s `vars`.
 */
export type Language = 'en' | 'id'
export type Bilingual = { readonly en: string; readonly id: string }

function t<K extends string>(entries: Record<K, Bilingual>): Record<K, Bilingual> {
  return entries
}

export const STOCK_MATRIX_COPY = t({
  navLink: { en: 'Stock by store', id: 'Stok per toko' },
  title: { en: 'Stock by store', id: 'Stok per toko' },
  intro: {
    en: 'Type what is on the shelf and press Enter, or move to the next box: it saves at once. Units waiting for a driver are taken off for you.',
    id: 'Ketik jumlah di rak lalu tekan Enter, atau pindah ke kotak berikutnya: langsung tersimpan. Unit yang menunggu pengemudi dikurangi otomatis.',
  },
  refusal: {
    en: 'Only staff count stock.',
    id: 'Hanya staf yang menghitung stok.',
  },
  findLabel: { en: 'Find a product by name or SKU', id: 'Cari produk menurut nama atau SKU' },
  findPlaceholder: { en: 'e.g. Batik or OEI-MUG', id: 'mis. Batik atau OEI-MUG' },
  storeLabel: { en: 'Store', id: 'Toko' },
  allStores: { en: 'All stores', id: 'Semua toko' },
  find: { en: 'Find', id: 'Cari' },
  clear: { en: 'Clear', id: 'Hapus' },
  filterAll: { en: 'All products', id: 'Semua produk' },
  filterLow: { en: 'Low stock (at or below {n})', id: 'Stok menipis (pada atau di bawah {n})' },
  filtersLabel: { en: 'Show', id: 'Tampilkan' },
  product: { en: 'Product', id: 'Produk' },
  tableLabel: { en: 'Stock counts', id: 'Jumlah stok' },
  found: { en: '{n} products', id: '{n} produk' },
  foundOne: { en: '1 product', id: '1 produk' },
  noneFound: {
    en: 'No product matches. Check the spelling, or search by part of the SKU.',
    id: 'Tidak ada produk yang cocok. Periksa ejaannya, atau cari dengan sebagian SKU.',
  },
  noneLow: {
    en: 'Nothing is low: every count is above {n}.',
    id: 'Tidak ada yang menipis: semua jumlah di atas {n}.',
  },
  noStores: {
    en: 'No store to count at. A store user’s account names their store; ask the owner.',
    id: 'Tidak ada toko untuk dihitung. Akun staf toko menyebut tokonya; tanyakan pemilik.',
  },
  pagePrev: { en: '← Previous', id: '← Sebelumnya' },
  pageNext: { en: 'Next →', id: 'Berikutnya →' },
  pageOf: { en: 'Page {n} of {m}', id: 'Halaman {n} dari {m}' },
  storesOf: {
    en: 'Stores {a}–{b} of {n}',
    id: 'Toko {a}–{b} dari {n}',
  },
  storesPrev: { en: '← Earlier stores', id: '← Toko sebelumnya' },
  storesNext: { en: 'Later stores →', id: 'Toko berikutnya →' },
  low: { en: 'Low', id: 'Menipis' },
  notStocked: { en: 'Not stocked here', id: 'Tidak ada di toko ini' },
  ownerAddsRow: {
    en: 'Not stocked here. The owner adds a product to a store.',
    id: 'Tidak ada di toko ini. Pemilik yang menambahkan produk ke toko.',
  },
  saving: { en: 'Saving…', id: 'Menyimpan…' },
  saved: { en: 'Saved', id: 'Tersimpan' },
  held: { en: 'Saved; {n} held for orders', id: 'Tersimpan; {n} ditahan untuk pesanan' },
  wholeNumber: { en: 'Type a whole number, 0 or more.', id: 'Ketik bilangan bulat, 0 atau lebih.' },
  notSaved: { en: 'Not saved: {reason}', id: 'Tidak tersimpan: {reason}' },
  tryAgain: { en: 'try again.', id: 'coba lagi.' },
  cellLabel: { en: '{product} at {store}', id: '{product} di {store}' },
})

export type CopyKey = keyof typeof STOCK_MATRIX_COPY

export function L(
  key: CopyKey,
  language: Language | string | undefined,
  vars: Record<string, string | number> = {},
): string {
  const entry = STOCK_MATRIX_COPY[key]
  const text = language === 'id' ? entry.id : entry.en
  return text.replace(/\{(\w+)\}/g, (hole, name: string) =>
    vars[name] === undefined ? hole : String(vars[name]),
  )
}
