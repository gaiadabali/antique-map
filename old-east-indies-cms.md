# Rencana — CMS Old East Indies yang mudah dipakai

**Status:** disetujui 2026-11-05 — **K1: dirombak sekarang di CMS yang ada** (bukan menunggu `cms-shop`;
fase 23 nanti memindahkannya). K2–K8 memakai usulan di §7 sampai diputuskan lain. Dikerjakan sebagai
**fase 27** di `TASKS.md`.
**Lingkup:** seluruh admin situs shop (Old East Indies): produk, koleksi (kategori), halaman, header dan
footer, pengaturan situs, order masuk, toko dan stok, staf, partner dan leads. Gallery tidak termasuk,
kecuali bagian bersama di `cms-core` yang otomatis ikut membaik untuk gallery nanti.

## 1. Kenapa sekarang terasa sulit

Ringkasan dari pemetaan kode dan uji waktu admin yang tercatat (`docs/gates/admin-usability.md`). Admin
sekarang adalah form bawaan Payload yang dirapikan tampilannya (fase 15–16), tetapi **alur kerjanya tidak
dirombak**. Akibatnya:

| # | Masalah | Dampak nyata |
| --- | --- | --- |
| 1 | **Stok tidak ada di produk.** Stok per toko adalah record terpisah (`stock-levels`). | Produk baru dengan stok di 3 toko = 1 form produk + 3 form stok. Uji waktu: 4:16 (target 3:00). |
| 2 | **Tiap foto butuh 4 isian wajib** (alt, subjek, peran, asal) di laci tersendiri, tanpa nilai bawaan. Tidak ada unggah banyak sekaligus. | Menambah 6 foto = 6 laci, 24 isian. |
| 3 | **Halaman ada di grup "Content"**, jauh dari shop, **tanpa preview**. | Editor tidak melihat hasilnya sebelum terbit. |
| 4 | **Halaman yang belum terbit diam-diam diganti teks bawaan dari kode** yang tidak terlihat di CMS. | Isi di situs ≠ isi di admin; membingungkan. |
| 5 | **16 jenis blok ditawarkan di setiap halaman**, termasuk blok khusus partnership di beranda. | Mudah salah pilih. |
| 6 | **Menu header, kolom footer, logo, link Privasi/Ketentuan (`#`) tertanam di kode.** | Mengganti satu menu butuh developer. |
| 7 | **Setelan "Announcement" shop tidak tampil di mana pun**; email, telepon, jam buka tidak tampil di footer. | Admin mengisi kolom yang tidak berefek. |
| 8 | **Ongkir saling bertentangan:** tabel jarak menghitung otomatis, tetapi setiap order tetap mulai di "menunggu harga" dengan panel "Kirim harga"; teks "gratis di atas Rp 500.000" di halaman produk ditulis mati di kode. | Aturan tidak jelas bagi admin maupun pembeli. |
| 9 | **Dua menu "Order"**: panel order dan tabel Payload berisi ±30 kolom yang hampir semuanya hanya-baca. | Admin tersesat ke form yang tidak bisa dipakai. |
| 10 | **Daftar stok hanya bisa dicari dengan ID**; pemilih produk di stok tidak mencari SKU. | Update stok lambat. |
| 11 | **Rel "Best sellers" sebenarnya produk terbaru**, foto hero otomatis; tidak bisa memilih produk sendiri. | Admin tidak bisa mengkurasi beranda. |
| 12 | **Gallery dan shop bercampur** di satu sidebar dan satu beranda admin. | Menu dua kali lebih panjang dari yang dibutuhkan. |
| 13 | **Urutan koleksi = angka yang diketik**; dari halaman koleksi tidak bisa melihat atau menambah produk. | |
| 14 | **Lokasi toko diketik sebagai lat/lng desimal.** | Rawan salah titik. |
| 15 | **Kode sambutan dan platform sosial adalah teks bebas** yang harus cocok persis dengan data lain. | Salah ketik = diskon/ikon tidak jalan. |

Yang **tidak bisa diubah owner tanpa developer** hari ini: menu dan footer, logo, link legal, teks tetap di
halaman produk ("300gsm cotton…", baris ongkir), teks bawaan beranda/partnership/stores, isi form
partnership, label status order, isi email ke pembeli dan toko, impor produk dan toko (hanya lewat CLI).

## 2. Prinsip rombakan

1. **Satu tugas, satu layar.** Pekerjaan harian (tambah produk, isi stok, proses order, ganti banner) selesai
   di satu tempat, tanpa membuka form lain.
2. **Isi sesedikit mungkin.** Nilai bawaan untuk semua yang bisa ditebak; yang wajib hanya yang benar-benar
   dibutuhkan untuk terbit.
3. **Apa yang dilihat di admin = apa yang tampil di situs.** Tidak ada teks cadangan tersembunyi; setiap
   halaman punya preview ponsel dan desktop.
4. **Konten milik owner ada di CMS.** Menu, footer, banner, teks promosi, halaman legal, email — bisa diubah
   tanpa developer. Yang tetap di kode hanya teks antarmuka teknis (pesan error checkout, label tombol
   sistem).
5. **Satu sumber kebenaran per aturan** (ongkir, gratis ongkir, kode sambutan).
6. **Aturan keamanan tidak berubah:** harga bulat rupiah dihitung server, stok berkurang atomik, webhook
   terverifikasi, staf toko hanya melihat tokonya (AGENTS.md).
7. **Diukur, bukan dirasa.** Setiap tugas harian punya target waktu dan diuji dengan orang sungguhan
   (§6).

## 3. Admin baru — per area

### 3.1 Beranda admin "Hari ini" dan menu

- **Beranda "Hari ini"** khusus shop: order yang perlu tindakan (dengan jumlah per status), stok menipis,
  produk draf, lead baru, angka penjualan 7 hari. Setiap kartu langsung membuka pekerjaannya.
- **Sidebar baru (shop saja, setelah pemisahan app — DR-17):**
  1. **Order** (satu pintu)
  2. **Produk** · **Koleksi** · **Kode diskon**
  3. **Toko & stok** (daftar toko, matriks stok, impor)
  4. **Halaman** · **Menu & footer**
  5. **Partner & leads**
  6. **Pengaturan** (Kontak & sosial, Checkout & ongkir, Notifikasi & email, Chat AI, Staf)
  7. *Teknis* (redirect, log notifikasi, log pembayaran) — dilipat, owner saja
- **Staf toko** hanya melihat **Order** dan **Stok tokonya**.

### 3.2 Produk — editor satu layar

- **Kolom utama berurutan:** Nama · Koleksi · Status (Draf/Terbit, tombol jelas, bukan di menu titik tiga) ·
  Deskripsi (teks kaya sederhana) · Foto · Harga & varian · **Stok per toko** · SEO (dilipat).
- **Foto:** seret-dan-lepas banyak foto sekaligus, urutkan dengan seret. Subjek, peran dan asal **otomatis**
  untuk foto produk; teks alt terisi dari nama produk dan bisa diedit. Foto pertama = sampul.
- **Varian dengan pembangun opsi:** isi opsi (mis. Ukuran: A4, A3; Bingkai: Tanpa, Kayu) → kombinasi dibuat
  otomatis sebagai tabel; SKU dibuat otomatis dari SKU induk dan bisa diedit; harga per varian opsional
  (bawaan = harga produk).
- **Stok per toko di produk:** tabel toko × varian, ketik jumlah fisik langsung. Disimpan ke `stock-levels`
  seperti sekarang (pengurangan saat order tetap satu perintah SQL atomik — tidak berubah).
- **Tombol:** Duplikat produk · Lihat di situs · Preview.
- **Daftar produk:** foto kecil, harga, total stok, status; filter cepat (Draf, Habis, Per koleksi);
  aksi massal: terbitkan, tarik, pindah koleksi.

### 3.3 Koleksi

- Daftar dengan **urutan seret** (bukan angka).
- Di halaman koleksi: **daftar produknya**, tambah/keluarkan produk dari sana, foto sampul, deskripsi.

### 3.4 Halaman

- Pindah ke grup shop, dengan **preview langsung** (Payload Live Preview) di lebar ponsel dan desktop.
- **Blok difilter per jenis halaman:** beranda hanya blok beranda + umum; partnership hanya blok partnership
  + umum; halaman bebas hanya blok umum.
- **Tidak ada teks cadangan tersembunyi:** beranda, partnership dan stores dibuat sebagai halaman nyata yang
  bisa diedit (seed sekali); situs merender dari CMS saja.
- **Rel produk bisa dikurasi:** pilih "pilih sendiri" (pemilih produk, urutkan seret), "terbaru" atau "dari
  koleksi". Foto hero bisa dipilih atau otomatis.
- **Halaman legal** (Privasi, Ketentuan, Pengiriman & pengembalian) sebagai halaman CMS biasa; teks counsel
  ditempel di sana saat siap (Q12).
- Teks tetap di halaman produk ("300gsm cotton…", "Dicetak di workshop kami", baris ongkir) pindah ke
  **Pengaturan → Teks halaman produk**.

### 3.5 Menu & footer (global baru)

- **Pengumuman:** teks (en/id), link, aktif/nonaktif, tanggal mulai/selesai. Benar-benar tampil di atas
  header.
- **Menu utama:** daftar item (label en/id, tujuan: halaman / koleksi / produk / alamat web), urutan seret.
- **Footer:** kolom-kolom berjudul, masing-masing berisi link; blok kontak (WhatsApp, email, telepon, jam —
  diambil dari Kontak & sosial); link legal; teks hak cipta.
- **Logo:** unggah logo terang dan gelap; bila kosong memakai logo bawaan.
- Link ke gallery diatur di sini (alamat dari konfigurasi, labelnya dari CMS).

### 3.6 Pengaturan — dipecah jadi layar yang jelas

| Layar | Isi | Perbaikan |
| --- | --- | --- |
| **Kontak & sosial** | WhatsApp, email, telepon, jam, janji balas | Platform sosial jadi **pilihan** (Instagram, Facebook, TikTok, …), bukan teks bebas |
| **Checkout & ongkir** | aktif/nonaktif, ongkir, gratis ongkir di atas, kode sambutan, masa berlaku order | **Satu model ongkir** (lihat keputusan K2); kode sambutan **dipilih** dari Kode diskon; angka gratis ongkir otomatis dipakai di halaman produk |
| **Notifikasi & email** | penerima alert toko, penerima lead; **subjek dan paragraf pembuka** tiap email ke pembeli/toko (en/id) | Isi email bisa diedit tanpa developer; isi teknis (rincian order, link lacak) tetap otomatis |
| **Chat AI** | aktif, anggaran harian, batas sesi | tetap |
| **Staf** | lihat 3.9 | |

### 3.7 Order — satu pintu, kotak masuk

- **Satu menu "Order"**; tabel Payload mentah disembunyikan dari menu.
- **Kotak masuk bertab:** Perlu tindakan · Diproses · Menunggu kurir · Dikirim · Selesai · Batal/Kedaluwarsa,
  masing-masing dengan jumlah. Cari nama pembeli, nomor order, telepon.
- **Halaman detail order:** pembeli, item, total, peta titik antar, toko, linimasa status; tombol aksi
  besar sesuai langkah berikutnya; unggah foto kurir; **tombol WhatsApp** ke pembeli dan toko (link
  `wa.me` berisi pesan siap kirim — tanpa API berbayar).
- **Pindah toko:** daftar toko ditandai "punya semua item" dan jaraknya, plus kolom alasan.
- **Cetak slip pengiriman** (opsional, lihat K6).
- Status order dan langkahnya tetap sama (DR-7); hanya cara kerjanya yang dipermudah.

### 3.8 Toko & stok

- **Lokasi toko dengan peta:** cari alamat atau geser pin (kunci Google Maps sudah ada, Q2).
- **Matriks stok:** produk × toko, cari nama atau SKU, ubah angka langsung; filter "menipis" (ambang per
  produk atau global).
- **Impor stok:** terima CSV **dan Excel**; baris yang ditolak tampil paling atas dengan alasannya.
- **Impor produk dan toko di admin** (bukan CLI saja), dengan pratinjau sebelum diterapkan.

### 3.9 Staf, partner, leads

- **Undang staf:** isi email, peran, toko (untuk staf toko) → email undangan untuk membuat password sendiri.
  Owner bisa reset password dan menonaktifkan akun.
- **Partner dan leads:** tetap seperti sekarang (kotak masuk lead sudah baik), dengan tombol balas WhatsApp
  dan "Jadikan partner".

### 3.10 Bahasa admin

Admin tetap dua bahasa. **Bahasa Inggris tetap bawaan** (K3, diputuskan 2026-11-05); tiap staf bisa memilih Bahasa Indonesia sendiri di akunnya.

## 4. Di mana dikerjakan — menyatu dengan Plan v2

Plan v2 (fase 23) sedang memindahkan shop ke app dan CMS sendiri (`engine/apps/shop`,
`engine/packages/cms-shop`, database `indies_shop`, migrasi awal baru). **Rombakan ini sebaiknya dibangun
langsung di `cms-shop`**, bukan di CMS lama:

- Perubahan skema (global Menu & footer, pengaturan yang dipecah, kurasi rel, urutan koleksi) masuk ke
  **migrasi awal** `cms-shop` — tanpa migrasi data, karena production belum punya data.
- Tidak dikerjakan dua kali: CMS lama akan dihapus di fase 26.
- Bagian bersama (unggah foto dengan nilai bawaan, undangan staf, preview halaman) dibuat di `cms-core`,
  sehingga gallery mendapatkannya gratis di fase 25.

**Usulan urutan:**

| Fase | Isi |
| --- | --- |
| 23 | App shop berdiri (seperti rencana): CMS, database, halaman, webhook, chat |
| **27 (baru) — Admin shop baru** | W1 model data · W2 layar-layar (produk, order, stok, halaman+preview, menu & footer, pengaturan) · W3 uji waktu dengan orang sungguhan |
| 24 | Data, CI dan staging shop — **staging langsung menampilkan admin baru** |
| 25–26 | Gallery dan pensiun app lama (seperti rencana) |

Perkiraan fase 27: **±6–8 hari kerja agen**, dijalankan satu per satu di laptop (tidak paralel berat).

**Alternatif (tidak disarankan):** merombak CMS lama sekarang agar cepat terlihat di staging. Kerja ganda,
dan semuanya harus dipindah lagi di fase 23.

## 5. Rincian fase 27 (draf)

| Task | Isi | Bukti selesai |
| --- | --- | --- |
| 27.1 Model data | global Menu & footer; pengaturan dipecah; rel kurasi; urutan koleksi; teks halaman produk; email yang bisa diedit; filter blok per halaman | migrasi `cms-shop` dibuat lead; `check:generated` bersih; db test akses per peran |
| 27.2 Editor produk | foto massal dengan bawaan; pembangun varian; tabel stok per toko; duplikat; status jelas; daftar dengan filter dan aksi massal | uji waktu T3 ≤ 3:00; db test stok atomik tetap hijau |
| 27.3 Order | kotak masuk bertab; detail order; pindah toko dengan tanda; tombol WhatsApp; satu pintu | uji waktu T8, T9 dalam target; staf toko hanya melihat tokonya |
| 27.4 Toko & stok | peta pin; matriks stok cari SKU; impor CSV/Excel; impor produk/toko | uji waktu T5 ≤ 0:30, T6 dalam target |
| 27.5 Halaman & tampilan | live preview; halaman nyata tanpa cadangan tersembunyi; header/footer/pengumuman dari CMS; halaman legal | setiap halaman shop 390/1280 en/id sama dengan preview; axe bersih |
| 27.6 Beranda admin, menu, staf | "Hari ini"; sidebar baru; undang staf | semua layar admin 390/1280, axe bersih |
| 27.7 Uji dengan orang | 2–3 orang tim owner (OA9) mengerjakan resep harian tanpa bantuan | tabel waktu, semua dalam target |

## 6. Target waktu tugas harian

| Tugas | Sekarang | Target |
| --- | --- | --- |
| Tambah produk, 6 foto, 2 varian, stok di 3 toko, terbit | 4:16 (simulasi) | **≤ 2:30** |
| Update stok satu produk di satu toko | 0:36 | **≤ 0:20** |
| Ganti foto dan judul hero beranda | — (tanpa preview) | **≤ 1:00**, dengan preview |
| Tambah item menu / kolom footer | developer | **≤ 0:30** |
| Pasang pengumuman promo bertanggal | tidak berfungsi | **≤ 0:45** |
| Proses order sampai "Terkirim" (staf toko) | 0:47 | **≤ 0:45** |
| Pindah order ke toko lain dengan alasan | 0:37 | **≤ 0:30** |
| Undang staf toko baru | developer/CLI | **≤ 1:00** |

## 7. Keputusan yang perlu Anda ambil

| # | Pertanyaan | Usulan saya |
| --- | --- | --- |
| **K1** | Dibangun di `cms-shop` sebagai fase 27 (setelah 23), atau rombak CMS lama sekarang? | **Fase 27 di `cms-shop`** |
| **K2** | Ongkir: otomatis dari tabel jarak, atau staf mengisi harga per order ("Kirim harga")? Sekarang dua-duanya ada. | **Otomatis dari tabel jarak**; "Kirim harga" hanya untuk pengecualian |
| **K3** | Bahasa bawaan admin untuk tim owner: Indonesia atau Inggris? | **Diputuskan 2026-11-05: Inggris** (seperti sekarang) |
| **K4** | Email ke pembeli/toko boleh diedit owner (subjek + pembuka)? | **Ya**, isi teknis tetap otomatis |
| **K5** | Notifikasi WhatsApp: tombol `wa.me` (gratis, manual) sekarang; WhatsApp Business API nanti (backlog v2.3)? | **Tombol `wa.me` sekarang** |
| **K6** | Perlu cetak slip pengiriman per order? | Opsional — ya bila toko memakai kertas |
| **K7** | Impor Excel (.xlsx) selain CSV untuk stok, produk dan toko? | **Ya** |
| **K8** | Ambang "stok menipis": satu angka global atau per produk? | **Global** (mis. 2), bisa ditimpa per produk |

Setelah keputusan ini, saya tulis fase 27 ke `TASKS.md` (tanpa commit) dan mulai setelah fase 23.
