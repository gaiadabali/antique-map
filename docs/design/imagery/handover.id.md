# Menyerahkan foto — file, nama, folder

> **Draf — menunggu tinjauan penutur asli (D20).**
> English: [handover.md](handover.md) · Nama file, nama folder, dan nama peran (*role*) di
> bawah ini sengaja tetap dalam bahasa Inggris, karena sistem membacanya.

Untuk pemilik, staf, dan pemeriksa. Bagaimana foto berpindah dari kamera ke platform tanpa
kehilangan kualitas di tengah jalan, dan apa yang terjadi pada foto-foto itu sesudahnya.

## 1. File mana yang dikirim

**Kirimkan file asli yang dibuat oleh kamera atau ponsel** — bukan salinan yang sudah
diedit, bukan tangkapan layar, bukan foto yang sudah melewati aplikasi chat.

| Diterima | Catatan |
| -------- | ------- |
| RAW kamera (file mentah kamera) — `.cr2` `.cr3` `.nef` `.arw` `.raf` `.orf` `.rw2` `.dng` | terbaik: menyimpan semua yang dilihat kamera |
| TIFF — `.tif` | baik, 8- atau 16-bit, dengan profil warnanya |
| JPEG — `.jpg` | baik, langsung dari kamera atau ponsel, dengan pengaturan kualitas tertinggi |
| HEIC — `.heic` (iPhone) | baik; kami yang mengonversinya |
| PNG, atau PDF dari pemindai (*scanner*) | diterima; kami yang mengonversinya — TIFF dari pemindai lebih baik |

Memotret RAW dan JPEG sekaligus? Kirim keduanya; kami memakai yang RAW.

**Tidak diterima**, karena gambarnya sudah dikecilkan atau diubah:

- foto yang dikirim lewat **WhatsApp** sebagai foto (termasuk "HD"), Instagram, Facebook,
  atau aplikasi chat apa pun;
- foto yang dilampirkan pada email yang menawarkan untuk "memperkecil ukuran";
- tautan dari aplikasi foto yang diatur untuk menghemat ruang (misalnya mode penghemat
  ruang penyimpanan di Google Photos);
- tangkapan layar, dan foto yang diedit di aplikasi filter atau aplikasi kecantikan.

Jika WhatsApp satu-satunya cara untuk beberapa file, kirimkan **sebagai dokumen** (ikon
penjepit kertas → Dokumen), bukan sebagai foto — cara itu menjaga file aslinya.

## 2. Nama

Nama file menyebutkan foto apa itu, sehingga tidak ada yang bergantung pada ingatan. Jika
memberi nama setiap file terlalu lama, masukkan foto-foto setiap karya ke dalam folder yang
dinamai sesuai karya itu (§3) dan kami yang mengganti namanya — itu termasuk "kami
perbaiki sendiri" (*fix — us*), tidak pernah menjadi masalah.

**Galeri — satu karya:** `<stock number>_<role>_<nn>.<ext>`

- nomor stok, dengan titiknya diganti tanda hubung: `M.9999` → `M-9999`;
- perannya, dalam huruf kecil: `recto` · `verso` · `detail` · `raking` · `transmitted` ·
  `framed` · `in-room` · `scale` — dan `ref` untuk foto uji atau foto acuan (papan abu-abu,
  kartu warna saja);
- nomor dua digit: `01`, `02`…

```
M-9999_recto_01.cr3
M-9999_verso_01.cr3
M-9999_detail_01.cr3      kartusnya
M-9999_detail_02.cr3      sobekan di pinggiran bawah
M-9999_raking_01.cr3
```

Karya yang belum punya nomor stok: `NEW-` dan nomor Anda sendiri (`NEW-014`).

**Toko — satu produk:** `<product>_<role>_<nn>.<ext>`, dengan nama produk berupa No. Arsip
jika ada, jika tidak beberapa kata yang dihubungkan tanda hubung (`tote-bali-map`,
`postcard-set-java`). Peran: `flat` · `detail` · `in-room` · `lifestyle` · `scale` ·
`packaging`. Format No. Arsip itu sendiri ditetapkan bersama sistem situs saudara (TASKS.md
12.3.a); sampai saat itu, pakai nomor apa pun yang dimiliki produk itu sekarang.

**Showroom:** `showroom_<area>_<nn>.<ext>`, dengan area `street` · `entrance` · `wide` ·
`wall` · `counter` · `vignette` · `making` — dan `ref` untuk foto acuan setiap ruangan
dengan kartu warna (shop-guide.id.md §5).

## 3. Folder

Satu folder bersama, disusun seperti ini:

```
<shared folder>/
  gallery/
    M-9999/                   satu folder per karya: foto-fotonya dan notes.txt
    M-9998/
    legacy-M-9997/            karya biasa yang dipindahkan: file lamanya, tanpa diubah
  shop/
    products/tote-bali-map/   foto katalog: flat, detail
    scenes/villa-morning/     satu folder per adegan: foto acuan lebih dulu, lalu fotonya
  showroom/
  notes.xlsx                  tidak wajib: satu baris per karya sebagai ganti file notes.txt
```

## 4. Catatan untuk setiap karya

Beberapa baris per karya, di `notes.txt` atau satu baris spreadsheet. Apa pun yang tidak
Anda ketahui, biarkan kosong — jangan pernah menebak.

| Catatan | Contoh |
| ------- | ------ |
| nomor stok | M.9999 |
| apa karya itu, sejauh yang Anda ketahui | peta Jawa, Blaeu, sekitar 1640 |
| ukuran lembar | 50 × 38 cm |
| berbingkai atau memakai passe-partout? dapatkah dikeluarkan dengan aman? | memakai passe-partout, dapat dikeluarkan |
| cacat yang Anda ketahui | sobekan yang sudah diperbaiki di pinggiran bawah; sedikit bercak cokelat (*foxing*) |
| kamera atau ponsel, dan cahaya yang dipakai | ponsel; cahaya jendela dan papan putih |
| apa pun yang pernah dilakukan pada foto-foto lama karya itu | foto lamanya pernah dicerahkan — tidak yakin |

Untuk toko, tambahkan untuk setiap adegan foto suasana: di mana tempatnya, dan apakah ada
orang yang dapat dikenali di dalamnya dan sudah memberikan persetujuan (§6).

## 5. Cara mengirim

- **Folder bersama di cloud** — Google Drive, Dropbox, atau apa pun yang sudah Anda pakai —
  yang dibagikan ke alamat yang tercantum dalam permintaan. Atau kami yang membuatnya dan
  mengirimkan link-nya kepada Anda.
- Unggah **dari kartu memori kamera, atau dari file di ponsel itu sendiri**. Jika ponsel
  atau aplikasinya bertanya, pilih "asli" (*original*) atau "ukuran sebenarnya" (*actual
  size*), jangan pernah "diperkecil" (*reduced*) atau "dioptimalkan" (*optimised*).
- Unggah satu karya lebih dulu, lalu kabari kami. Kami memeriksanya sebelum Anda
  melanjutkan, sehingga masalah pada susunan pemotretan ditemukan sebelum Anda memotret
  karya-karya lainnya.
- **Kami tidak pernah mengambil apa pun dari situs-situs yang ada saat ini.** Foto berasal
  dari Anda.

## 6. Privasi dan persetujuan

- **Lokasi.** Ponsel mencatat di mana setiap foto diambil. Kami menyimpan file aslinya
  secara pribadi dan **menghapus data lokasi dan data kamera dari semua yang
  diterbitkan**. Jika Anda lebih suka lokasi itu tidak pernah keluar dari ponsel Anda,
  matikan lokasi di pengaturan kamera sebelum memotret.
- **Orang.** Orang yang dapat dikenali dalam foto toko memerlukan persetujuan tertulisnya,
  dan anak-anak memerlukan persetujuan orang tuanya — staf juga. Kami akan mengirimkan
  formulir persetujuan sepanjang satu paragraf untuk ini; tangan tidak memerlukan apa pun.
- **Stok Anda.** File-file itu menunjukkan apa yang Anda miliki dan di mana disimpan;
  file-file itu tetap di penyimpanan pribadi dan tidak dibagikan kepada siapa pun di luar
  tim desain.

## 7. Apa yang terjadi sesudahnya

1. Kami menyalin setiap file, persis seperti yang diterima, ke penyimpanan pribadi
   platform (*masters bucket*, tempat penyimpanan file induk). **Tidak ada yang
   diterbitkan.**
2. Kami memeriksa setiap gambar berdasarkan spesifikasi penerimaan (*intake spec*) dan
   menaruh laporan di folder itu (`_intake`): lolos (*pass*), kami perbaiki sendiri (*fix —
   us*), perlu difoto ulang oleh pemilik (*fix — owner*), atau ditolak (*reject*), beserta
   alasan untuk masing-masing (intake-spec.md §7).
3. Gambar yang lolos dipakai untuk merancang halaman-halaman baru. Pada tahap desain,
   gambar-gambar itu ditunjukkan kepada Anda dan kepada sekelompok kecil pembeli uji coba
   (TASKS.md 13.2); tidak ada yang tampil di situs publik sampai Anda menyetujuinya.
