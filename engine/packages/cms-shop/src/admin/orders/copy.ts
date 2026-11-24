/**
 * The words of the orders inbox and order page (TASKS.md 27.3), both languages for every key
 * (AGENTS.md: copy lives in keyed files, never in components). The panel's earlier words — the
 * statuses, the refusals, the quote, replace and hand-back sheets — stay in
 * `../../i18n/orders-panel`; `./shared.jsx`'s `L` reads this file first, then that one.
 */
type Bilingual = { readonly en: string; readonly id: string }

function t<K extends string>(entries: Record<K, Bilingual>): Record<K, Bilingual> {
  return entries
}

export const ORDERS_INBOX_COPY = t({
  inboxTitle: { en: 'Orders', id: 'Pesanan' },
  navLink: { en: 'Orders', id: 'Pesanan' },
  tabsLabel: { en: 'Orders by status', id: 'Pesanan menurut status' },
  tab_needs_action: { en: 'Needs action', id: 'Perlu tindakan' },
  tab_processing: { en: 'Processing', id: 'Diproses' },
  tab_waiting_driver: { en: 'Waiting for driver', id: 'Menunggu pengemudi' },
  tab_on_the_way: { en: 'On the way', id: 'Dalam perjalanan' },
  tab_delivered: { en: 'Delivered', id: 'Terkirim' },
  tab_closed: { en: 'Cancelled / expired', id: 'Dibatalkan / kedaluwarsa' },
  searchLabel: { en: 'Search orders', id: 'Cari pesanan' },
  searchPlaceholder: {
    en: 'Buyer, order number or phone',
    id: 'Pembeli, nomor pesanan atau telepon',
  },
  searchSubmit: { en: 'Search', id: 'Cari' },
  searchClear: { en: 'Clear', id: 'Hapus' },
  searchResults: { en: 'Results for “{q}”', id: 'Hasil untuk “{q}”' },
  allStores: { en: 'All stores', id: 'Semua toko' },
  emptyTab: { en: 'No orders here.', id: 'Tidak ada pesanan di sini.' },

  // The order page
  buyer: { en: 'Buyer', id: 'Pembeli' },
  whatsappToBuyer: { en: 'WhatsApp the buyer', id: 'WhatsApp pembeli' },
  whatsappToStore: { en: 'WhatsApp the store', id: 'WhatsApp toko' },
  deliverTo: { en: 'Deliver to', id: 'Kirim ke' },
  pinOnMap: { en: 'Open the pin in Google Maps', id: 'Buka titik di Google Maps' },
  pinCoordinates: { en: 'Pin', id: 'Titik' },
  distanceFromStore: { en: '{km} km from the store', id: '{km} km dari toko' },
  store: { en: 'Store', id: 'Toko' },
  storeNoWhatsapp: {
    en: 'This store has no WhatsApp number yet.',
    id: 'Toko ini belum punya nomor WhatsApp.',
  },
  timeline: { en: 'Timeline', id: 'Riwayat' },
  timelinePlaced: { en: 'Placed', id: 'Dipesan' },
  timelineSystem: { en: 'automatic', id: 'otomatis' },
  timelineStaff: { en: 'staff', id: 'staf' },
  timelineUpdate: { en: 'Update', id: 'Pembaruan' },
  reassignOthers: {
    en: '{n} other active stores are missing an item of this order.',
    id: '{n} toko aktif lain kekurangan barang pesanan ini.',
  },
  subtotal: { en: 'Items', id: 'Barang' },
  discount: { en: 'Discount', id: 'Diskon' },
  deliveryFree: { en: 'Free', id: 'Gratis' },
  deliveryToQuote: { en: 'To be quoted', id: 'Belum diberi harga' },
  payBy: { en: 'Pay by {time}', id: 'Bayar sebelum {time}' },

  // The one next step
  nextStep: { en: 'Next step', id: 'Langkah berikutnya' },
  nextTo_processing: { en: 'Start packing', id: 'Mulai kemas' },
  nextTo_waiting_driver: { en: 'Packed — book a driver', id: 'Sudah dikemas — pesan pengemudi' },
  nextTo_on_the_way: { en: 'Driver collected it', id: 'Sudah diambil pengemudi' },
  nextTo_delivered: { en: 'Mark delivered', id: 'Tandai terkirim' },
  stepWaitingPayment: {
    en: 'Waiting for the buyer to pay. Nothing to do yet — you can send them a reminder.',
    id: 'Menunggu pembeli membayar. Belum ada tindakan — Anda bisa mengirim pengingat.',
  },
  stepNeedsPhoto: {
    en: 'Add the driver’s photo first, then mark it collected.',
    id: 'Tambahkan foto pengemudi dulu, lalu tandai sudah diambil.',
  },
  stepDone: {
    en: 'Nothing left to do on this order.',
    id: 'Tidak ada lagi tindakan pada pesanan ini.',
  },
  moreActions: { en: 'More', id: 'Lainnya' },
  stepBack: { en: 'Step back to “{status}”', id: 'Mundur ke “{status}”' },

  // Reassign (TASKS.md 27.3.c)
  reassignTitle: { en: 'Send from another store', id: 'Kirim dari toko lain' },
  reassignHint: {
    en: 'Stores that hold every item come first, nearest the buyer’s pin first.',
    id: 'Toko yang punya semua barang ditampilkan dulu, dari yang terdekat ke titik pembeli.',
  },
  holdsEveryItem: { en: 'Holds every item', id: 'Punya semua barang' },
  reassignReason: { en: 'Why move it?', id: 'Kenapa dipindah?' },
  reassignReasonPlaceholder: {
    en: 'Out of stock at this store, store closed today…',
    id: 'Stok habis di toko ini, toko tutup hari ini…',
  },
  reassignNone: {
    en: 'No other active store holds every item of this order.',
    id: 'Tidak ada toko aktif lain yang punya semua barang pesanan ini.',
  },

  // Packing slip (the plan's K6)
  packingSlip: { en: 'Packing slip', id: 'Slip pengemasan' },
  packingSlipPrint: { en: 'Print', id: 'Cetak' },
  packingSlipBack: { en: 'Back to the order', id: 'Kembali ke pesanan' },
  packingSlipQty: { en: 'Qty', id: 'Jml' },
  packingSlipItem: { en: 'Item', id: 'Barang' },
  packingSlipChecked: { en: 'Packed', id: 'Dikemas' },
})
