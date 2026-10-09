/**
 * Copy for the stock import screen (TASKS.md 10.8.a; CONTENT-OPERATIONS.md §3). Every key is
 * bilingual (AGENTS.md: "Copy lives in keyed lexicon files, never in components").
 */
export type Language = 'en' | 'id'
export type Bilingual = { readonly en: string; readonly id: string }

function t<K extends string>(entries: Record<K, Bilingual>): Record<K, Bilingual> {
  return entries
}

export const STOCK_IMPORT_COPY = t({
  navLink: { en: 'Import stock', id: 'Impor stok' },
  title: { en: 'Import stock from a spreadsheet', id: 'Impor stok dari lembar kerja' },
  refusalNotOwner: {
    en: 'Only the owner imports stock.',
    id: 'Hanya pemilik yang dapat mengimpor stok.',
  },
  intro: {
    en: 'Upload a CSV file (UTF-8) with the columns store_code, sku and quantity. You see what would change first; nothing is saved until you press Apply. In Excel or Sheets, use Save as "CSV UTF-8".',
    id: 'Unggah berkas CSV (UTF-8) dengan kolom store_code, sku, dan quantity. Anda melihat dulu apa yang akan berubah; tidak ada yang disimpan sampai Anda menekan Terapkan. Di Excel atau Sheets, gunakan Simpan sebagai "CSV UTF-8".',
  },
  fileLabel: { en: 'CSV file', id: 'Berkas CSV' },
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
  rowsToChange: { en: 'Rows that change stock', id: 'Baris yang mengubah stok' },
  rowsRejected: { en: 'Rows that were not accepted', id: 'Baris yang tidak diterima' },
  rowLabel: { en: 'Row', id: 'Baris' },
  rejectedNote: {
    en: 'Rejected and held rows are skipped. Fix them in the file and upload it again.',
    id: 'Baris yang ditolak atau ditahan dilewati. Perbaiki di berkas lalu unggah lagi.',
  },
  nothingToApply: {
    en: 'Nothing to apply: no row would change stock.',
    id: 'Tidak ada yang perlu diterapkan: tidak ada baris yang mengubah stok.',
  },
  truncated: {
    en: 'Only the first rows are listed here. The counts above cover the whole file.',
    id: 'Hanya baris pertama yang ditampilkan. Jumlah di atas mencakup seluruh berkas.',
  },
  errorNoFile: { en: 'Choose a CSV file first.', id: 'Pilih berkas CSV dulu.' },
  errorNetwork: {
    en: 'Could not reach the server. Try again.',
    id: 'Tidak dapat menghubungi server. Coba lagi.',
  },
  errorNotCsv: { en: 'Only .csv files are read.', id: 'Hanya berkas .csv yang dibaca.' },
  errorNotCsvFix: {
    en: 'In Excel or Sheets, save the sheet as "CSV UTF-8" and upload that.',
    id: 'Di Excel atau Sheets, simpan lembar sebagai "CSV UTF-8" lalu unggah.',
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
    en: 'Only the owner imports stock.',
    id: 'Hanya pemilik yang dapat mengimpor stok.',
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
