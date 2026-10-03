/** The chat's server-built words in Indonesian (*Anda*); the keys are `./en`'s, all of them. */
import 'server-only'

import type { ChatCopyKey } from './en'

export const ID = {
  'status.search': 'Mencari di katalog',
  'status.item': 'Mencari barang',
  'status.stores': 'Memeriksa toko kami',
  'status.delivery': 'Memeriksa pengiriman',
  'status.handoff': 'Menyiapkan tautan kontak',
  'status.lead': 'Menyiapkan formulir kontak',

  'canned.refused':
    'Saya tidak dapat membantu hal itu di sini, tetapi tim kami bisa. Silakan hubungi {site} langsung melalui tombol di bawah.',
  'canned.blocked':
    'Saya tidak dapat menjawabnya di chat. Tim kami siap membantu: silakan gunakan tombol di bawah.',
  'canned.abuse':
    'Saya di sini untuk membantu pertanyaan tentang {site}. Tim kami dapat dihubungi di bawah.',
  'canned.unavailable':
    'Asisten sedang tidak tersedia. Silakan hubungi {site} melalui tombol di bawah.',
  'canned.price':
    'Harga diberikan oleh galeri atas permintaan. Silakan tanyakan langsung kepada tim melalui tombol di bawah.',

  'error.rate_limited': 'Anda mengirim pesan terlalu cepat. Mohon tunggu sebentar lalu coba lagi.',
  'error.budget_exhausted':
    'Asisten sedang beristirahat hari ini. Silakan hubungi {site} melalui tombol di bawah.',
  'error.disabled': 'Asisten sedang dinonaktifkan. Silakan hubungi {site} melalui tombol di bawah.',
  'error.unavailable':
    'Asisten sedang tidak tersedia. Silakan hubungi {site} melalui tombol di bawah.',
  'error.too_long': 'Pesan itu terlalu panjang. Mohon batasi hingga 1.000 karakter.',
  'error.session_limit':
    'Percakapan ini telah mencapai batasnya. Silakan lanjutkan dengan tim melalui tombol di bawah.',
  'error.session_required': 'Silakan buka chat lagi untuk memulai percakapan baru.',
  'error.challenge_required': 'Mohon konfirmasi bahwa Anda bukan robot untuk melanjutkan.',
  'error.bad_request': 'Pesan itu tidak dapat dibaca. Silakan coba lagi.',

  'handoff.whatsapp': 'Lanjutkan di WhatsApp',
  'handoff.email': 'Kirim email',
  'handoff.greeting': 'Halo {site}, saya ingin bertanya tentang {topic}.',
  'handoff.items': 'Barang:',
  'handoff.summary': 'Pertanyaan saya: {summary}',
  'handoff.subject': 'Pertanyaan dari situs: {topic}',
  'handoff.promise': '{promise}',

  'topic.item_enquiry': 'sebuah barang',
  'topic.price': 'harga sebuah barang',
  'topic.sell_to_us': 'menjual barang kepada Anda',
  'topic.partnership': 'kemitraan',
  'topic.order': 'sebuah pesanan',
  'topic.delivery': 'pengiriman',
  'topic.authenticity': 'keaslian atau nilai sebuah barang',
  'topic.general': 'pertanyaan umum',

  'consent.text':
    'Bagikan detail ini kepada {site} agar mereka dapat menghubungi Anda tentang hal ini.',

  'work.available': 'Tercantum tersedia',
  'work.on-hold': 'Sedang ditahan',
  'work.sold': 'Terjual',
  'product.inStock': 'Tersedia',
  'product.outOfStock': 'Stok habis',

  'delivery.gallery':
    'Pengiriman diatur dan dihitung oleh galeri bersama Anda setelah pembelian disepakati. Tidak ada tanggal atau tujuan yang dijanjikan sebelumnya.',
  'delivery.shop':
    'Pengiriman dilakukan dari salah satu toko kami di Bali, berdasarkan jarak dari toko. Ongkos kirim dan gratis ongkir dihitung saat checkout.',
} as const satisfies Record<ChatCopyKey, string>
