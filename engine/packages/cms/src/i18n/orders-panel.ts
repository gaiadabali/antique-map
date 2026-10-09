/**
 * Copy for the store staff panel and the owner/editor order views (TASKS.md 7.2;
 * CONTENT-OPERATIONS.md §5). Every key is bilingual (AGENTS.md: "Copy lives in keyed lexicon
 * files, never in components"). `refusal` keys mirror the fulfilment core's refusal codes
 * (`shop/fulfilment/types.ts`) so a button a person cannot use says why in their own language,
 * without the core ever producing localized text itself.
 */
export type Language = 'en' | 'id'
export type Bilingual = { readonly en: string; readonly id: string }

function t<K extends string>(entries: Record<K, Bilingual>): Record<K, Bilingual> {
  return entries
}

export const ORDERS_PANEL_COPY = t({
  // Page titles
  queueTitle: { en: 'Your orders', id: 'Pesanan Anda' },
  ordersTitle: { en: 'Orders', id: 'Pesanan' },
  // The sidebar link to the panel (the collection list is Payload's plain table)
  navLink: { en: 'Order panel', id: 'Panel pesanan' },

  // Store view: groups
  groupNeedsPrice: { en: 'Needs a delivery price', id: 'Perlu ongkos kirim' },
  groupWaitingForPayment: { en: 'Waiting for payment', id: 'Menunggu pembayaran' },
  groupNew: { en: 'New', id: 'Baru' },
  groupInProgress: { en: 'In progress', id: 'Sedang diproses' },
  groupDeliveredToday: { en: 'Delivered today', id: 'Terkirim hari ini' },
  emptyList: {
    en: 'No orders here right now.',
    id: 'Belum ada pesanan di sini.',
  },

  // Store view: detail
  items: { en: 'Items', id: 'Barang' },
  address: { en: 'Address', id: 'Alamat' },
  openInMaps: { en: 'Open in Maps', id: 'Buka di Maps' },
  whatsappBuyer: { en: 'Message the buyer', id: 'Pesan WhatsApp ke pembeli' },
  giftNote: { en: 'Gift note', id: 'Catatan hadiah' },
  driverNotes: { en: 'Delivery notes', id: 'Catatan pengiriman' },
  total: { en: 'Total', id: 'Total' },
  back: { en: 'Back', id: 'Kembali' },

  // The one big button and its confirm sheet
  confirmTitle: { en: 'Confirm', id: 'Konfirmasi' },
  confirmMoveTo: { en: 'Mark this order', id: 'Tandai pesanan ini' },
  confirm: { en: 'Confirm', id: 'Konfirmasi' },
  cancelSheet: { en: 'Never mind', id: 'Batal' },
  noNextStep: {
    en: 'Nothing to do — this order is settled.',
    id: 'Tidak ada tindakan — pesanan ini sudah selesai.',
  },

  // Driver image
  driverImageTitle: { en: 'Driver’s details', id: 'Data pengemudi' },
  driverImageHint: {
    en: 'Take a photo or upload the screenshot from Gojek or Grab before marking the order on the way.',
    id: 'Ambil foto atau unggah tangkapan layar dari Gojek atau Grab sebelum menandai pesanan sedang dalam perjalanan.',
  },
  driverImageUpload: { en: 'Add driver details', id: 'Tambahkan data pengemudi' },
  driverImageUploading: { en: 'Uploading…', id: 'Mengunggah…' },
  driverImageAttached: { en: 'Driver’s details attached', id: 'Data pengemudi terlampir' },

  // Hand back
  handBack: { en: 'Can’t send this', id: 'Tidak bisa kirim' },
  handBackReasonLabel: { en: 'Why?', id: 'Kenapa?' },
  handBackReasonPlaceholder: {
    en: 'An item is missing or damaged, the store is closing…',
    id: 'Barang hilang atau rusak, toko akan tutup…',
  },
  handBackSubmit: { en: 'Hand back', id: 'Kembalikan' },
  handBackSent: {
    en: 'Handed back to the owner and editors for reassignment.',
    id: 'Dikembalikan ke pemilik dan editor untuk dialihkan.',
  },

  // Owner / editor view
  filterStatus: { en: 'Status', id: 'Status' },
  filterStore: { en: 'Store', id: 'Toko' },
  filterAll: { en: 'All', id: 'Semua' },
  needsAttention: { en: 'Needs you', id: 'Perlu perhatian Anda' },
  reassign: { en: 'Reassign', id: 'Alihkan' },
  reassignToStore: { en: 'Send to store', id: 'Kirim ke toko' },
  reassignSubmit: { en: 'Confirm reassignment', id: 'Konfirmasi pengalihan' },
  reassignNotEnoughStock: {
    en: 'That store cannot fill every line of this order.',
    id: 'Toko itu tidak dapat memenuhi semua barang pesanan ini.',
  },
  cancelOrder: { en: 'Cancel order', id: 'Batalkan pesanan' },
  cancelReasonLabel: { en: 'Reason', id: 'Alasan' },
  cancelSubmit: { en: 'Confirm cancellation', id: 'Konfirmasi pembatalan' },

  // Send price (TASKS.md 6.6.c)
  deliveryFee: { en: 'Delivery', id: 'Ongkos kirim' },
  sendPriceTitle: { en: 'Send the delivery price', id: 'Kirim ongkos kirim' },
  sendPriceLabel: { en: 'Delivery fee (Rp)', id: 'Ongkos kirim (Rp)' },
  sendPriceHint: { en: 'Enter 0 for free delivery.', id: 'Masukkan 0 untuk gratis ongkos kirim.' },
  sendPriceSubmit: { en: 'Send price', id: 'Kirim harga' },
  quoteByPrefix: { en: 'Quote by', id: 'Beri harga sebelum' },
  whatsappOrderMessage: {
    en: 'Here is the delivery price for your order',
    id: 'Berikut ongkos kirim untuk pesanan Anda',
  },
  whatsappOrderLink: { en: 'Send by WhatsApp', id: 'Kirim lewat WhatsApp' },

  // Refusals (`MoveRefusal`, `AttachRefusal`, `ReassignRefusal`, `HandBackRefusal`)
  refusal_not_staff: {
    en: 'Only staff act on an order.',
    id: 'Hanya staf yang dapat memproses pesanan.',
  },
  refusal_not_found: { en: 'There is no such order.', id: 'Pesanan tidak ditemukan.' },
  refusal_not_your_store: {
    en: 'This order belongs to another store.',
    id: 'Pesanan ini milik toko lain.',
  },
  refusal_no_change: {
    en: 'The order is already in that status.',
    id: 'Pesanan sudah berstatus demikian.',
  },
  refusal_move_not_allowed: {
    en: 'That move is not allowed from here.',
    id: 'Perpindahan status itu tidak diperbolehkan dari sini.',
  },
  refusal_driver_image_required: {
    en: 'Add the driver’s details first.',
    id: 'Tambahkan data pengemudi terlebih dahulu.',
  },
  refusal_order_closed: {
    en: 'This order is not open for the driver’s details.',
    id: 'Pesanan ini tidak dapat diberi data pengemudi.',
  },
  refusal_empty_file: { en: 'The file is empty.', id: 'Berkas kosong.' },
  refusal_too_large: {
    en: 'The image is larger than 10 MB. Send a screenshot instead.',
    id: 'Gambar lebih besar dari 10 MB. Kirim tangkapan layar saja.',
  },
  refusal_not_an_image: {
    en: 'The file is not a JPEG, PNG or WebP image.',
    id: 'Berkas bukan gambar JPEG, PNG, atau WebP.',
  },
  refusal_unreadable_image: {
    en: 'The image could not be read. Take a new screenshot and try again.',
    id: 'Gambar tidak dapat dibaca. Ambil tangkapan layar baru dan coba lagi.',
  },
  refusal_storage_unavailable: {
    en: 'Uploads are not available right now. Try again shortly.',
    id: 'Unggahan belum tersedia saat ini. Coba lagi sebentar lagi.',
  },
  refusal_not_allowed: {
    en: 'You may not do that.',
    id: 'Anda tidak dapat melakukan itu.',
  },
  refusal_wrong_status: {
    en: 'This order is not in a status that allows that.',
    id: 'Status pesanan ini tidak mengizinkan tindakan itu.',
  },
  refusal_same_store: {
    en: 'The order is already at that store.',
    id: 'Pesanan sudah berada di toko itu.',
  },
  refusal_store_unavailable: {
    en: 'That store is not available for orders.',
    id: 'Toko itu tidak tersedia untuk menerima pesanan.',
  },
  refusal_not_enough_stock: {
    en: 'That store cannot fill every line of this order.',
    id: 'Toko itu tidak dapat memenuhi semua barang pesanan ini.',
  },
  refusal_reason_required: { en: 'Say why.', id: 'Sebutkan alasannya.' },
  refusal_not_awaiting_quote: {
    en: 'This order is no longer awaiting a price.',
    id: 'Pesanan ini sudah tidak menunggu harga.',
  },
  refusal_expired: {
    en: 'The time to quote this order has run out.',
    id: 'Waktu untuk memberi harga pesanan ini sudah habis.',
  },
  refusal_invalid_fee: {
    en: 'Enter a whole number of rupiah, 0 or more.',
    id: 'Masukkan angka rupiah bulat, 0 atau lebih.',
  },
  refusal_forbidden: {
    en: 'You may not quote this order.',
    id: 'Anda tidak dapat memberi harga pesanan ini.',
  },
  refusal_unavailable: {
    en: 'Something went wrong. Try again.',
    id: 'Terjadi kesalahan. Coba lagi.',
  },
})

export type OrdersPanelCopyKey = keyof typeof ORDERS_PANEL_COPY

export function orderLabel(key: OrdersPanelCopyKey, language: Language): string {
  return ORDERS_PANEL_COPY[key][language] ?? ORDERS_PANEL_COPY[key].en
}
