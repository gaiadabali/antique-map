# Old East Indies — Project Memory

Konteks proyek yang harus dibaca di setiap percakapan baru. Ditulis 11 September 2026, setelah meeting klien pertama.

---

## Status

Meeting klien pertama **sudah selesai**. Keputusan struktur sudah diambil. Satu hal masih menunggu klien: **warna**.

Keputusan akhir **bukan** Asumsi A maupun Asumsi B dari deck onboarding. Jawabannya: **3 website**, dengan komposisi berbeda dari kedua asumsi itu.

---

## Tiga website

### 1. Revamp — antiquemapsindonesia.com

Website lama mereka, dibangun ulang.

**Ketentuan utama (dari klien, tidak boleh dilanggar):**
- Khusus menjual **barang asli yang mahal**
- Tampilan harus **super premium dan luxury**
- **Tidak ada transaksi** di website ini
- Pembeli yang ingin membeli atau **nego** harus **contact lewat form email**

**Tugas riset yang diminta klien:**
- Eksplorasi **menyeluruh tanpa terlewat** atas website lama mereka, analisa **detail, mendalam, menyeluruh**

### 2. Old East Indies

Website baru untuk barang yang lebih murah — **print souvenir**.

**Ketentuan utama:**
- Di sinilah **e-commerce konvensional** berjalan
- Ada **payment gateway**
- Ada **shipping**
- Di sini ada **partnership dengan retailer**
- **Pembeli umum tidak punya akun** — beli lepas (guest checkout)

**User account KHUSUS retailer** (keputusan 11 Sept 2026). Implementasinya:
- Di **hero** ada section highlight partnership → ini salah satu **gate** ke halaman Partnership
- Gate kedua: menu **Partnership** di header navigasi
- **Halaman Partnership** berisi informasi penting; **section paling akhir** adalah section CTA yang menjadi bridging ke **form sign up / sign in** (boleh pop up, boleh form langsung tampil di section itu)

### 3. Kingdoms of Indonesia

- **Belum ada brief dan konteks** di proyek ini
- Semacam **ensiklopedia digital**
- **BUKAN sibling** dari website 1 dan 2 — tidak ada keterkaitan look and feel maupun konektivitas. Yang sama hanya kliennya
- Informasinya baru sebatas itu — simpan, jangan dikembangkan sendiri

---

## Referensi terpilih (untuk website 1 DAN 2)

Klien memilih dua dari dua belas referensi awal.

### A. Etalage — https://www.etalage.co.uk/
- **Showcase catalogue** (khususnya)
- **Deskripsi dan penyajian produk yang detail**
- Klien minta dieksplorasi lagi **menyeluruh tanpa terlewat**, dianalisa **detail dan mendalam** — boleh menambahkan temuan lain

### B. Everart — https://everartprints.com/
- **Showcase catalogue yang konsisten**, memakai **frame lukisan yang artistik**
- **Filtering yang lengkap**
- Klien minta dieksplorasi lagi **menyeluruh tanpa terlewat**, dianalisa **detail dan mendalam** — boleh menambahkan temuan lain

---

## Catatan penting untuk website 1 dan 2

- Kedua website harus punya **korelasi dan konektivitas** satu sama lain
- Harus ada **bridge dari Revamp ke Old East Indies, dan sebaliknya** (dua arah)
- Keduanya harus punya **look and feel yang sama**: layout, karakteristik button, tipografi, dan lainnya — karena keduanya **"siblings"**
- **Klien TIDAK suka style** di deck slide 7 — klien masih mencari-cari. **Kita yang merekomendasikan** (keputusan 11 Sept 2026)
- **Klien TIDAK suka pemilihan warna** di deck slide 7 — klien masih mencari-cari. **Kita yang merekomendasikan** (keputusan 11 Sept 2026)
- **Klien SANGAT SUKA lettering** di deck slide 7 → Cormorant Garamond (judul) + Karla (teks bacaan). **Ini dipertahankan.**
- Kedua referensi (Etalage dan Everart) dipakai **mix and match** — yang diambil adalah **look and feel**-nya, bukan disalin satu per satu

---

## Aset dan file proyek

| File | Isi |
|---|---|
| `Onboarding Document - EN.dc.html` | Deck 8 slide, Inggris — dipakai di meeting pertama |
| `Onboarding Document - ID.dc.html` | Versi Bahasa Indonesia |
| `Client Brief & References Analysis.dc.html` | Riset 12 referensi + analisa form submission. **Satu-satunya sumber** temuan LITO Masters, Etalage Trade Membership, 1000Museums, spesifikasi material |
| `scratchpad.md` | Sistem template PPTX + riset fase pertama (antiquemapsindonesia, Bartele, 1stDibs) |
| `assets/` | Logo klien, background cover dan konten, logo Gaia |
| `template/` | Hasil ekstraksi PPTX asli |

**Template deck (dari file PPTX klien):** kuning `#FED756`, Arial, 1920×1080. Tiga layout: cover (panel kuning kiri 50%), section (kuning penuh), konten (band kuning atas 21%, logo Gaia kiri atas).

**Warna dari logo klien** (diukur piksel, bukan dikira-kira): cokelat `#593D21`, krem `#F1E5D3`. Klien belum menyetujui palet — masih dicari.

---

## Isi form submission klien (fase awal)

- **Kenapa sekarang:** memasok **100+ toko** dengan art souvenir; ingin "more after sales", website tempat orang bisa browse produk, baca artikel, dan melihat **cara mereka membuat souvenir dari peta dan cetakan antik asli**
- **Jenis bisnis:** Retail / e-commerce
- **Current site:** NONE (untuk bisnis souvenir)
- **Keinginan:** jual online · terlihat kredibel di mata pembeli serius · menjelaskan apa yang sebenarnya mereka kerjakan · **menghemat waktu admin** · membuat pelanggan lama kembali
- **Katalog Bali 2026** (PDF) — **tidak bisa diunduh**, belum pernah terbaca
- **Aset terkuat klien:** memiliki fisik peta antik aslinya; kurator **Dr David E. Parry** menulis buku rujukan kartografi Hindia Timur; klien institusional (National Museum of Singapore, National Library of Australia, Louvre Abu Dhabi, University of Leiden)

---

## Yang masih terbuka

1. **Warna** — klien belum memutuskan, masih mencari
2. **Style / look and feel** — klien belum memutuskan, masih mencari
3. **Kingdoms of Indonesia** — belum ada brief
4. **Katalog Bali 2026** — belum ada feedback lanjutan dari klien. Kerjakan dulu sebagai **rekomendasi dan hasil sementara**; jenis produk, jumlah SKU, dan tingkat harga souvenir masih asumsi kita
5. ~~Mekanisme partnership retailer~~ — **SUDAH DIPUTUSKAN**, lihat bagian Website 2 di atas

---

## Aturan kerja di proyek ini

- Saat revisi, **timpa file lama** — jangan buat v1, v2, dan seterusnya
- Jangan pakai istilah teknis berlebihan di materi klien
- Klien membaca dalam Bahasa Indonesia dan Inggris — deck selalu dibuat dua versi
- Jangan mengarang angka atau klaim tentang situs pesaing. Kalau belum diperiksa, jangan ditulis
