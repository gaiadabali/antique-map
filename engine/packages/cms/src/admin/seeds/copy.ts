/**
 * Copy for the seed screen (`/admin/seeds`). Every key is bilingual (AGENTS.md: "Copy lives in
 * keyed lexicon files, never in components").
 */
export type Language = 'en' | 'id'
export type Bilingual = { readonly en: string; readonly id: string }

function t<K extends string>(entries: Record<K, Bilingual>): Record<K, Bilingual> {
  return entries
}

export const SEEDS_COPY = t({
  navLink: { en: 'Run seeds', id: 'Jalankan seed' },
  title: { en: 'Run seeds', id: 'Jalankan seed' },
  intro: {
    en: 'Loads the seed data committed in the code into this site’s database — after a deploy that changed it, press the matching button. Each seed is safe to run again: it adds what is missing and never overwrites what was edited here.',
    id: 'Memuat data seed yang ada di kode ke database situs ini — setelah deploy yang mengubahnya, tekan tombol yang sesuai. Setiap seed aman dijalankan ulang: ia menambah yang belum ada dan tidak menimpa yang sudah diedit di sini.',
  },
  refusalNotOwner: { en: 'Only the owner runs seeds.', id: 'Hanya pemilik yang menjalankan seed.' },
  refusalProduction: {
    en: 'Seeds never run on the live site. They run on staging and on a workstation.',
    id: 'Seed tidak pernah dijalankan di situs live. Seed berjalan di staging dan di komputer pengembang.',
  },
  everythingTitle: { en: 'Seed everything', id: 'Seed semua' },
  everythingBody: {
    en: 'Everything below for the Old East Indies shop, in order: the mock stores, stock and discounts, then the categories and tags, the products with their pictures and web sizes, and the shop pages. The gallery is not touched.',
    id: 'Semua di bawah untuk toko Old East Indies, berurutan: toko, stok dan diskon contoh, lalu kategori dan tag, produk dengan gambar dan ukuran webnya, dan halaman toko. Galeri tidak disentuh.',
  },
  vocabularyTitle: { en: 'Categories and tags', id: 'Kategori dan tag' },
  vocabularyBody: {
    en: 'The shop’s categories, the tags, grades, places and makers, and the site settings’ defaults.',
    id: 'Kategori toko, tag, kelas kondisi, tempat dan pembuat, serta nilai awal pengaturan situs.',
  },
  catalogueTitle: { en: 'Shop products', id: 'Produk toko' },
  catalogueBody: {
    en: 'The designs in the seed data, with their pictures, variants and stock; published. The pictures’ web sizes are made afterwards. Test products from staging rehearsals are taken off the shop.',
    id: 'Desain di data seed, dengan gambar, varian dan stoknya; langsung terbit. Ukuran web gambar dibuat sesudahnya. Produk uji dari latihan staging diturunkan dari toko.',
  },
  pagesTitle: { en: 'Shop pages', id: 'Halaman toko' },
  pagesBody: {
    en: 'The home, partnership and stores pages as editable sections, in both languages — only where the page does not exist yet.',
    id: 'Halaman beranda, kemitraan dan toko sebagai bagian yang bisa diedit, dalam dua bahasa — hanya bila halamannya belum ada.',
  },
  picturesTitle: { en: 'Picture sizes', id: 'Ukuran gambar' },
  picturesBody: {
    en: 'Makes the web sizes of every picture still waiting for them.',
    id: 'Membuat ukuran web untuk setiap gambar yang masih menunggu.',
  },
  run: { en: 'Run', id: 'Jalankan' },
  running: {
    en: 'Running… this can take a few minutes. You may leave this page.',
    id: 'Sedang berjalan… bisa beberapa menit. Halaman ini boleh ditinggalkan.',
  },
  done: { en: 'Finished', id: 'Selesai' },
  failed: { en: 'Stopped with an error', id: 'Berhenti karena galat' },
  lastRun: { en: 'Last run', id: 'Terakhir dijalankan' },
  busy: {
    en: 'Another seed is still running. Wait for it to finish.',
    id: 'Seed lain masih berjalan. Tunggu sampai selesai.',
  },
  errorFailed: {
    en: 'The seed could not start. Try again in a moment.',
    id: 'Seed tidak bisa dimulai. Coba lagi sebentar lagi.',
  },
})

export function L(key: keyof typeof SEEDS_COPY, language: Language): string {
  const entry = SEEDS_COPY[key]
  return entry[language] ?? entry.en
}
