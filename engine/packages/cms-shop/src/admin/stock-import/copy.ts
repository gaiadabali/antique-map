/**
 * Copy for the import screen (TASKS.md 10.8.a, 27.4.c; CONTENT-OPERATIONS.md §3): stock, products
 * and stores, from a CSV or an Excel workbook. Every key is
 * bilingual (AGENTS.md: "Copy lives in keyed lexicon files, never in components").
 */
export type Language = 'en' | 'id'
export type Bilingual = { readonly en: string; readonly id: string }

function t<K extends string>(entries: Record<K, Bilingual>): Record<K, Bilingual> {
  return entries
}

export const STOCK_IMPORT_COPY = t({
  navLink: { en: 'Import spreadsheets', id: 'Impor lembar kerja' },
  title: { en: 'Import from a spreadsheet', id: 'Impor dari lembar kerja' },
  refusalNotOwner: {
    en: 'Only the owner imports spreadsheets.',
    id: 'Hanya pemilik yang dapat mengimpor lembar kerja.',
  },
  intro: {
    en: 'Upload an Excel workbook (.xlsx, the first sheet is read) or a CSV file (UTF-8). You see what would change first, with any row that cannot be used at the top; nothing is saved until you press Apply. Rows are matched by SKU or store code, so the same file twice changes nothing.',
    id: 'Unggah buku kerja Excel (.xlsx, lembar pertama yang dibaca) atau berkas CSV (UTF-8). Anda melihat dulu apa yang akan berubah, dengan baris yang tidak bisa dipakai di paling atas; tidak ada yang disimpan sampai Anda menekan Terapkan. Baris dicocokkan menurut SKU atau kode toko, jadi berkas yang sama dua kali tidak mengubah apa pun.',
  },
  kindLegend: { en: 'What the file holds', id: 'Isi berkas' },
  kindStock: { en: 'Stock counts', id: 'Jumlah stok' },
  kindProducts: { en: 'Products', id: 'Produk' },
  kindStores: { en: 'Stores', id: 'Toko' },
  columnsLabel: {
    en: 'Row 1 holds these columns, spelled exactly:',
    id: 'Baris 1 berisi kolom ini, dieja persis:',
  },
  noteStock: {
    en: 'Each row is the count on the shelf at one store. Units waiting for a driver are taken off for you.',
    id: 'Setiap baris adalah jumlah di rak satu toko. Unit yang menunggu pengemudi dikurangi otomatis.',
  },
  noteProducts: {
    en: 'A new product arrives as a draft; publish it in the product editor, where its photos are added. A variant row names its product in parent_sku.',
    id: 'Produk baru masuk sebagai draf; terbitkan di editor produk, tempat fotonya ditambahkan. Baris varian menyebut produknya di parent_sku.',
  },
  noteStores: {
    en: 'An empty cell keeps what the store has. An active store needs its address, lat and lng.',
    id: 'Sel kosong mempertahankan data toko. Toko aktif perlu alamat, lat, dan lng.',
  },
  fileLabel: { en: 'Excel or CSV file', id: 'Berkas Excel atau CSV' },
  preview: { en: 'Preview', id: 'Pratinjau' },
  apply: { en: 'Apply', id: 'Terapkan' },
  reset: { en: 'Choose another file', id: 'Pilih berkas lain' },
  working: { en: 'Working…', id: 'Memproses…' },
  previewTitle: { en: 'Preview: nothing is saved yet', id: 'Pratinjau: belum ada yang disimpan' },
  appliedTitle: { en: 'Applied', id: 'Diterapkan' },
  countNew: { en: 'New', id: 'Baru' },
  countUpdated: { en: 'Changed', id: 'Diubah' },
  countUnchanged: { en: 'Unchanged', id: 'Tidak berubah' },
  countRejected: { en: 'Rejected', id: 'Ditolak' },
  countHeld: { en: 'Held', id: 'Ditahan' },
  rowsToChange: { en: 'Rows that change something', id: 'Baris yang mengubah data' },
  rowsRejected: {
    en: 'Rows that cannot be used — fix these first',
    id: 'Baris yang tidak bisa dipakai — perbaiki ini dulu',
  },
  rowLabel: { en: 'Row', id: 'Baris' },
  rejectedNote: {
    en: 'Rejected and held rows are skipped. Fix them in the file and upload it again.',
    id: 'Baris yang ditolak atau ditahan dilewati. Perbaiki di berkas lalu unggah lagi.',
  },
  nothingToApply: {
    en: 'Nothing to apply: no row would change anything.',
    id: 'Tidak ada yang perlu diterapkan: tidak ada baris yang mengubah data.',
  },
  truncated: {
    en: 'Only the first rows are listed here. The counts above cover the whole file.',
    id: 'Hanya baris pertama yang ditampilkan. Jumlah di atas mencakup seluruh berkas.',
  },
  errorNoFile: {
    en: 'Choose an Excel or CSV file first.',
    id: 'Pilih berkas Excel atau CSV dulu.',
  },
  errorNetwork: {
    en: 'Could not reach the server. Try again.',
    id: 'Tidak dapat menghubungi server. Coba lagi.',
  },
  errorNotSheet: {
    en: 'Only Excel workbooks (.xlsx) and .csv files are read.',
    id: 'Hanya buku kerja Excel (.xlsx) dan berkas .csv yang dibaca.',
  },
  errorNotSheetFix: {
    en: 'In Excel or Sheets, save the sheet as "Excel Workbook (.xlsx)" or "CSV UTF-8" and upload that.',
    id: 'Di Excel atau Sheets, simpan lembar sebagai "Excel Workbook (.xlsx)" atau "CSV UTF-8" lalu unggah.',
  },
  errorTooBig: { en: 'The file is over the 10 MB limit.', id: 'Berkas melebihi batas 10 MB.' },
  errorTooBigFix: {
    en: 'Save it as several smaller files.',
    id: 'Simpan sebagai beberapa berkas yang lebih kecil.',
  },
  errorNoUpload: {
    en: 'No file came with the request.',
    id: 'Tidak ada berkas yang dikirim.',
  },
  errorForbidden: {
    en: 'Only the owner imports spreadsheets.',
    id: 'Hanya pemilik yang dapat mengimpor lembar kerja.',
  },
  errorFailed: {
    en: 'The import failed. Nothing was saved.',
    id: 'Impor gagal. Tidak ada yang disimpan.',
  },
})

export function L(key: keyof typeof STOCK_IMPORT_COPY, language: Language): string {
  const entry = STOCK_IMPORT_COPY[key]
  return entry[language] ?? entry.en
}
