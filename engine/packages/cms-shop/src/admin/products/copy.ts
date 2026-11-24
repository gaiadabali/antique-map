/**
 * Copy for the product editor and the product list (TASKS.md 27.2; the plan's §3.2). Every key is
 * bilingual (AGENTS.md: "Copy lives in keyed lexicon files, never in components"); `{n}`-style
 * placeholders are filled by `fill`.
 */
export type Language = 'en' | 'id'
export type Bilingual = { readonly en: string; readonly id: string }

function t<K extends string>(entries: Record<K, Bilingual>): Record<K, Bilingual> {
  return entries
}

export const PRODUCT_COPY = t({
  // The status control
  statusLabel: { en: 'Status', id: 'Status' },
  draft: { en: 'Draft', id: 'Draf' },
  published: { en: 'Published', id: 'Terbit' },
  draftNote: {
    en: 'Not on the site. Publish when the name, category, price and a photo are in.',
    id: 'Belum tampil di situs. Terbitkan setelah nama, kategori, harga, dan foto terisi.',
  },
  publishedNote: { en: 'On the site.', id: 'Tampil di situs.' },
  changedNote: {
    en: 'On the site, with changes not yet published.',
    id: 'Tampil di situs, dengan perubahan yang belum diterbitkan.',
  },
  publish: { en: 'Publish', id: 'Terbitkan' },
  publishChanges: { en: 'Publish changes', id: 'Terbitkan perubahan' },
  unpublish: { en: 'Back to draft', id: 'Kembalikan ke draf' },
  unpublished: {
    en: 'Back to draft: the product is off the site.',
    id: 'Kembali ke draf: produk tidak lagi tampil di situs.',
  },
  unpublishFailed: {
    en: 'Could not take the product off the site. Try again.',
    id: 'Produk tidak dapat ditarik dari situs. Coba lagi.',
  },
  // Photos
  photosLabel: { en: 'Photos', id: 'Foto' },
  photosHelp: {
    en: 'Drop several photos at once, or choose them. Drag to reorder: the first is the cover. Each starts as a product photo with the product’s name as its alt text.',
    id: 'Letakkan beberapa foto sekaligus, atau pilih. Seret untuk mengurutkan: foto pertama menjadi sampul. Tiap foto otomatis menjadi foto produk dengan nama produk sebagai teks alternatif.',
  },
  dropHere: { en: 'Drop photos here', id: 'Letakkan foto di sini' },
  choosePhotos: { en: 'Choose photos', id: 'Pilih foto' },
  nameFirst: {
    en: 'Type the product’s name first: it becomes the photos’ alt text.',
    id: 'Isi nama produk dulu: nama itu menjadi teks alternatif foto.',
  },
  uploading: { en: 'Uploading {n} photos…', id: 'Mengunggah {n} foto…' },
  uploadFailed: {
    en: '“{name}” was not uploaded: {reason}',
    id: '“{name}” tidak terunggah: {reason}',
  },
  cover: { en: 'Cover', id: 'Sampul' },
  photoN: { en: 'Photo {n}', id: 'Foto {n}' },
  altLabel: { en: 'Alt text (what it shows)', id: 'Teks alternatif (apa yang terlihat)' },
  altSaved: { en: 'Alt text saved', id: 'Teks alternatif tersimpan' },
  altFailed: { en: 'Alt text not saved', id: 'Teks alternatif tidak tersimpan' },
  captionLabel: { en: 'Caption', id: 'Keterangan' },
  moveEarlier: { en: 'Move earlier', id: 'Pindah ke depan' },
  moveLater: { en: 'Move later', id: 'Pindah ke belakang' },
  removePhoto: { en: 'Remove', id: 'Hapus' },
  noPhotos: { en: 'No photos yet.', id: 'Belum ada foto.' },
  // Variants
  variantsLabel: { en: 'Variants', id: 'Varian' },
  variantsHelp: {
    en: 'Optional. Name each option and list its values, e.g. Size: A4, A3. Make variants builds every combination; SKUs come from the product’s SKU and stay editable. A variant without a price sells at the product’s.',
    id: 'Opsional. Beri nama tiap opsi dan daftar nilainya, mis. Ukuran: A4, A3. Buat varian menyusun semua kombinasi; SKU dibuat dari SKU produk dan tetap bisa diubah. Varian tanpa harga dijual dengan harga produk.',
  },
  optionName: { en: 'Option', id: 'Opsi' },
  optionNamePlaceholder: { en: 'e.g. Size', id: 'mis. Ukuran' },
  optionValues: { en: 'Values, separated by commas', id: 'Nilai, dipisah koma' },
  optionValuesPlaceholder: { en: 'e.g. A4, A3', id: 'mis. A4, A3' },
  addOption: { en: 'Add an option', id: 'Tambah opsi' },
  removeOption: { en: 'Remove option', id: 'Hapus opsi' },
  makeVariants: { en: 'Make variants', id: 'Buat varian' },
  skuFirst: {
    en: 'Give the product its SKU first: the variants’ SKUs are made from it.',
    id: 'Isi SKU produk dulu: SKU varian dibuat darinya.',
  },
  variantLabel: { en: 'Variant', id: 'Varian' },
  variantSku: { en: 'SKU', id: 'SKU' },
  variantPrice: { en: 'Price (Rp)', id: 'Harga (Rp)' },
  variantPriceHint: { en: 'Product’s price', id: 'Harga produk' },
  onSale: { en: 'On sale', id: 'Dijual' },
  removeVariant: { en: 'Remove variant', id: 'Hapus varian' },
  addVariant: { en: 'Add a variant by hand', id: 'Tambah varian manual' },
  noVariants: {
    en: 'No variants: the product sells as one item under its own SKU.',
    id: 'Tanpa varian: produk dijual sebagai satu barang dengan SKU-nya sendiri.',
  },
  // Stock
  stockLabel: { en: 'Stock per store', id: 'Stok per toko' },
  stockHelp: {
    en: 'Type what is on the shelf; it saves when you leave the box. Units held for open orders are taken off for you.',
    id: 'Ketik jumlah di rak; tersimpan saat Anda keluar dari kotak. Unit untuk pesanan yang masih terbuka dikurangi otomatis.',
  },
  stockSaveFirst: {
    en: 'Save the draft first: stock is counted for a saved product.',
    id: 'Simpan draf dulu: stok dicatat untuk produk yang sudah disimpan.',
  },
  stockUnsavedVariants: {
    en: 'Save the product to count stock for the variants you just changed.',
    id: 'Simpan produk untuk mencatat stok varian yang baru diubah.',
  },
  findStore: { en: 'Find a store', id: 'Cari toko' },
  findStorePlaceholder: { en: 'Name or code', id: 'Nama atau kode' },
  store: { en: 'Store', id: 'Toko' },
  stockColumn: { en: 'On the shelf', id: 'Di rak' },
  total: { en: 'Total', id: 'Total' },
  showAllStores: { en: 'Show all {n} stores', id: 'Tampilkan semua {n} toko' },
  noStores: { en: 'No store matches.', id: 'Tidak ada toko yang cocok.' },
  saving: { en: 'Saving…', id: 'Menyimpan…' },
  saved: { en: 'Saved', id: 'Tersimpan' },
  held: { en: '{n} held for orders', id: '{n} ditahan untuk pesanan' },
  notSaved: { en: 'Not saved: {reason}', id: 'Tidak tersimpan: {reason}' },
  wholeNumber: {
    en: 'a whole number, 0 or more',
    id: 'bilangan bulat, 0 atau lebih',
  },
  ownerAddsRow: {
    en: 'Only the owner starts counting a product at a new store.',
    id: 'Hanya pemilik yang memulai pencatatan produk di toko baru.',
  },
  // Document actions
  duplicate: { en: 'Duplicate', id: 'Duplikat' },
  duplicating: { en: 'Duplicating…', id: 'Menduplikat…' },
  duplicateFailed: {
    en: 'Could not duplicate the product.',
    id: 'Produk tidak dapat diduplikat.',
  },
  viewOnSite: { en: 'View on the site', id: 'Lihat di situs' },
  notOnSiteYet: { en: 'Not on the site yet', id: 'Belum tampil di situs' },
  // The list
  quickFilters: { en: 'Show', id: 'Tampilkan' },
  filterAll: { en: 'All', id: 'Semua' },
  filterDrafts: { en: 'Drafts', id: 'Draf' },
  filterOutOfStock: { en: 'Out of stock', id: 'Stok habis' },
  filterCategory: { en: 'Category', id: 'Kategori' },
  anyCategory: { en: 'Any category', id: 'Semua kategori' },
  moveTo: { en: 'Move {n} selected to', id: 'Pindahkan {n} terpilih ke' },
  move: { en: 'Move', id: 'Pindahkan' },
  moved: { en: 'Moved {n} products.', id: '{n} produk dipindahkan.' },
  moveFailed: { en: 'Not moved: {reason}', id: 'Tidak dipindahkan: {reason}' },
  bulkHint: {
    en: 'Tick products to publish, unpublish or move them together.',
    id: 'Centang produk untuk menerbitkan, menarik, atau memindahkannya sekaligus.',
  },
  noPhoto: { en: 'No photo', id: 'Tanpa foto' },
  unitsInStock: { en: '{n} in stock', id: 'stok {n}' },
  outOfStock: { en: 'Out of stock', id: 'Habis' },
  tryAgain: { en: 'Try again.', id: 'Coba lagi.' },
})

export type CopyKey = keyof typeof PRODUCT_COPY

/** A key's words in `language`, its `{name}` placeholders filled from `values`. */
export function L(
  key: CopyKey,
  language: string | undefined,
  values: Record<string, string | number> = {},
): string {
  const entry = PRODUCT_COPY[key]
  const words = language === 'id' ? entry.id : entry.en
  return words.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  )
}
