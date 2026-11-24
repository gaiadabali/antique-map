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
    en: 'Loads the seed data committed in the code into this site’s database — after a deploy that changed it, press the matching button. Each seed is safe to run again: it adds what is missing and never overwrites what was edited here — except Client preview, which says what it overwrites.',
    id: 'Memuat data seed yang ada di kode ke database situs ini — setelah deploy yang mengubahnya, tekan tombol yang sesuai. Setiap seed aman dijalankan ulang: ia menambah yang belum ada dan tidak menimpa yang sudah diedit di sini — kecuali Pratinjau klien, yang menyebutkan apa yang ditimpanya.',
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
  previewTitle: { en: 'Client preview', id: 'Pratinjau klien' },
  previewBody: {
    en: 'Sample content for the client’s review, so this site looks like the preview. It OVERWRITES the shop’s Home and Partnership pages with the latest built-in versions (other pages are untouched; missing built-in pages are added), and sets these sample fields whatever they hold now: the shop’s WhatsApp (+62 812 9925 3712) and newsletter pop-up, product types (subject categories’ products move to Mounted Art Prints and those categories become drafts), themes on products, exactly seven best sellers, store regions and the two flagships, and the Map of Bali Island 1724’s four sizes and prices. It also adds the four themes and two sample articles with their PDFs if missing. Only the shop is touched, never the gallery. Running it again changes nothing more.',
    id: 'Konten contoh untuk ditinjau klien, agar situs ini tampil seperti pratinjaunya. Seed ini MENIMPA halaman Beranda dan Kemitraan toko dengan versi bawaan terbaru (halaman lain tidak disentuh; halaman bawaan yang belum ada ditambahkan), dan mengisi kolom contoh berikut apa pun isinya sekarang: WhatsApp toko (+62 812 9925 3712) dan pop-up newsletter, jenis produk (produk di kategori subjek dipindah ke Cetakan Seni Mounted dan kategori itu menjadi draf), tema pada produk, tepat tujuh produk terlaris, wilayah toko dan dua toko utama, serta empat ukuran dan harga Peta Pulau Bali 1724. Seed ini juga menambah empat tema dan dua artikel contoh beserta PDF-nya bila belum ada. Hanya toko yang disentuh, galeri tidak. Menjalankannya lagi tidak mengubah apa pun.',
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
