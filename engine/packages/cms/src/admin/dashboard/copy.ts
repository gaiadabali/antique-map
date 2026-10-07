/**
 * The dashboard's words, in both of the admin's languages (the 3.6 pattern: `{ en, id }` beside
 * the code, never a literal in a component). `text(language, key)` falls back to English for any
 * other language the admin may be shown in.
 */

type Pair = { readonly en: string; readonly id: string }

export const COPY = {
  title: { en: 'Dashboard', id: 'Dasbor' },
  intro: {
    en: 'First-party analytics, counted on our own servers. Days are Bali time (UTC+8).',
    id: 'Analitik pihak pertama, dihitung di server kami sendiri. Hari mengikuti waktu Bali (UTC+8).',
  },
  back: { en: 'Back to the admin', id: 'Kembali ke admin' },
  panelLess: {
    en: 'The dashboard is the owner’s. Your account has no panels here.',
    id: 'Dasbor ini milik pemilik. Akun Anda tidak memiliki panel di sini.',
  },
  loadFailed: {
    en: 'The dashboard could not be read just now. Try again in a moment.',
    id: 'Dasbor tidak dapat dibaca saat ini. Coba lagi sebentar lagi.',
  },
  siteGallery: { en: 'Indies Gallery', id: 'Indies Gallery' },
  siteShop: { en: 'Old East Indies', id: 'Old East Indies' },
  periodLabel: { en: 'Period', id: 'Periode' },
  last7: { en: 'Last 7 days', id: '7 hari terakhir' },
  last30: { en: 'Last 30 days', id: '30 hari terakhir' },
  last90: { en: 'Last 90 days', id: '90 hari terakhir' },
  rangeFrom: { en: 'From', id: 'Dari' },
  rangeTo: { en: 'To', id: 'Sampai' },
  rangeApply: { en: 'Show range', id: 'Tampilkan rentang' },
  comparing: {
    en: 'Compared with the {days} days before ({from} to {to}).',
    id: 'Dibandingkan dengan {days} hari sebelumnya ({from} sampai {to}).',
  },
  noEvents: {
    en: 'No events yet in this period.',
    id: 'Belum ada peristiwa pada periode ini.',
  },
  noChats: {
    en: 'No chat sessions yet in this period.',
    id: 'Belum ada sesi chat pada periode ini.',
  },
  noList: { en: 'Nothing to list yet.', id: 'Belum ada yang bisa ditampilkan.' },
  vsPrevious: { en: 'vs previous', id: 'dari sebelumnya' },
  noChange: { en: 'no change', id: 'tidak berubah' },
  newInPeriod: { en: 'new', id: 'baru' },
  open: { en: 'Open', id: 'Buka' },

  visitors: { en: 'Visitors', id: 'Pengunjung' },
  sessions: { en: 'Sessions', id: 'Sesi' },
  pageViews: { en: 'Page views', id: 'Tampilan halaman' },
  perDay: { en: 'A day', id: 'Per hari' },
  topPages: { en: 'Top pages', id: 'Halaman teratas' },
  referrers: { en: 'Referrers', id: 'Perujuk' },
  utmSources: { en: 'Campaign sources', id: 'Sumber kampanye' },
  devices: { en: 'Phone vs desktop', id: 'Ponsel vs desktop' },
  languages: { en: 'English vs Indonesian', id: 'Inggris vs Indonesia' },
  mobile: { en: 'Phone', id: 'Ponsel' },
  tablet: { en: 'Tablet', id: 'Tablet' },
  desktop: { en: 'Desktop', id: 'Desktop' },
  en: { en: 'English', id: 'Inggris' },
  id: { en: 'Indonesian', id: 'Indonesia' },

  search: { en: 'Search', id: 'Pencarian' },
  searches: { en: 'Searches', id: 'Pencarian' },
  zeroResultsCount: { en: 'Found nothing', id: 'Tidak menemukan apa pun' },
  topQueries: { en: 'Top queries', id: 'Kata kunci teratas' },
  zeroQueries: {
    en: 'Searches that found nothing — what collectors want that is not in the drawers',
    id: 'Pencarian tanpa hasil — yang dicari kolektor tetapi belum ada di laci',
  },

  antiques: { en: 'Antiques', id: 'Barang antik' },
  views: { en: 'Views', id: 'Dilihat' },
  asks: { en: 'Asks', id: 'Pertanyaan' },
  zooms: { en: 'Zooms', id: 'Diperbesar' },
  askRate: { en: 'Views → ask', id: 'Dilihat → tanya' },
  mostViewed: { en: 'Most viewed', id: 'Paling banyak dilihat' },
  mostZoomed: { en: 'Most zoomed', id: 'Paling banyak diperbesar' },
  byType: { en: 'By object type', id: 'Menurut jenis objek' },
  byMaker: { en: 'By maker', id: 'Menurut pembuat' },
  byPlace: { en: 'By place', id: 'Menurut tempat' },
  untitled: { en: 'Untitled', id: 'Tanpa judul' },

  asksAndSells: { en: 'Asks and sells', id: 'Bertanya dan menjual' },
  taps: { en: 'Taps', id: 'Ketukan' },
  tapsNote: {
    en: 'A tap on WhatsApp or email is a tap, not a lead: only a stored enquiry is a lead.',
    id: 'Ketukan WhatsApp atau email hanyalah ketukan, bukan calon pembeli: hanya pertanyaan yang tersimpan yang dihitung.',
  },
  byChannel: { en: 'Taps by channel', id: 'Ketukan menurut saluran' },
  byContext: { en: 'Ask taps by place on the page', id: 'Ketukan tanya menurut tempat' },
  leads: { en: 'Leads (spam excluded)', id: 'Calon pembeli (tanpa spam)' },
  leadsByKind: { en: 'Leads by kind', id: 'Calon pembeli menurut jenis' },
  replies: { en: 'First reply', id: 'Balasan pertama' },
  repliesNote: {
    en: 'Against the promise of the same working day (Monday to Friday, Singapore time).',
    id: 'Dibandingkan janji hari kerja yang sama (Senin sampai Jumat, waktu Singapura).',
  },
  answeredInTime: { en: 'Answered in time', id: 'Dibalas tepat waktu' },
  answeredLate: { en: 'Answered late', id: 'Dibalas terlambat' },
  overdue: { en: 'Overdue, no reply', id: 'Lewat waktu, belum dibalas' },
  stillOpen: { en: 'Waiting, within the promise', id: 'Menunggu, masih dalam janji' },
  medianHours: { en: 'Median hours to reply', id: 'Median jam untuk membalas' },
  inTimeShare: { en: 'Answered in time (%)', id: 'Dibalas tepat waktu (%)' },
  ask: { en: 'Ask', id: 'Tanya' },
  sell: { en: 'Sell', id: 'Jual' },
  partnership: { en: 'Partnership', id: 'Kemitraan' },
  contact: { en: 'Contact', id: 'Kontak' },
  chat: { en: 'Chat', id: 'Chat' },
  whatsapp: { en: 'WhatsApp', id: 'WhatsApp' },
  email: { en: 'Email', id: 'Email' },
  form: { en: 'Form', id: 'Formulir' },
  item: { en: 'On an item', id: 'Pada barang' },
  product: { en: 'On a product', id: 'Pada produk' },
  page: { en: 'On a page', id: 'Pada halaman' },
  footer: { en: 'In the footer', id: 'Di footer' },

  chatPanel: { en: 'Chat', id: 'Chat' },
  chatSessions: { en: 'Sessions', id: 'Sesi' },
  handoffs: { en: 'Hand-offs', id: 'Diteruskan' },
  handoffRate: { en: 'Hand-off rate (%)', id: 'Tingkat diteruskan (%)' },
  handoffChannels: { en: 'Hand-offs by channel', id: 'Diteruskan menurut saluran' },
  leadsCaptured: { en: 'Leads captured', id: 'Calon pembeli terjaring' },
  refused: { en: 'Refused', id: 'Ditolak' },
  blocked: { en: 'Blocked', id: 'Diblokir' },
  aiCost: { en: 'AI cost (USD)', id: 'Biaya AI (USD)' },

  paidOrders: { en: 'Paid orders', id: 'Pesanan dibayar' },
  revenue: { en: 'Revenue', id: 'Pendapatan' },
  businessNote: {
    en: 'Counted from the orders themselves, not from events.',
    id: 'Dihitung dari pesanan itu sendiri, bukan dari peristiwa.',
  },
  funnel: { en: 'Funnel', id: 'Corong' },
  sales: { en: 'Sales', id: 'Penjualan' },
  fulfilment: { en: 'Fulfilment', id: 'Pemenuhan' },
  payments: { en: 'Payments', id: 'Pembayaran' },
  vitals: { en: 'Web vitals', id: 'Vital web' },

  averageOrder: { en: 'Average order', id: 'Rata-rata pesanan' },
  discountShare: { en: 'Orders with a discount code (%)', id: 'Pesanan dengan kode diskon (%)' },
  freeDeliveryShare: { en: 'Free delivery (%)', id: 'Pengiriman gratis (%)' },
  byStore: { en: 'By store', id: 'Menurut toko' },
  byDistanceBand: { en: 'By distance', id: 'Menurut jarak' },
  byProduct: { en: 'By product', id: 'Menurut produk' },
  byCategory: { en: 'By category', id: 'Menurut kategori' },
  uncategorised: { en: 'Uncategorised', id: 'Tanpa kategori' },

  paidToProcessing: { en: 'Paid → processing', id: 'Dibayar → diproses' },
  processingToOnTheWay: { en: 'Processing → on the way', id: 'Diproses → dalam perjalanan' },
  onTheWayToDelivered: { en: 'On the way → delivered', id: 'Dalam perjalanan → terkirim' },
  medianHoursShort: { en: 'Median hours', id: 'Median jam' },
  ordersWaitingNow: { en: 'Orders waiting now', id: 'Pesanan yang sedang menunggu' },
  expiredCancelledShare: {
    en: 'Expired or cancelled (%, of orders placed)',
    id: 'Kedaluwarsa atau dibatalkan (%, dari pesanan dibuat)',
  },

  methodMix: { en: 'Payment methods', id: 'Metode pembayaran' },
  expiredUnpaidRate: {
    en: 'Expired, never paid (%, of orders placed)',
    id: 'Kedaluwarsa, tidak pernah dibayar (%, dari pesanan dibuat)',
  },
  flaggedPayments: { en: 'Flagged for staff', id: 'Ditandai untuk staf' },
  flaggedNote: {
    en: 'Counts only — no order id, amount or buyer detail.',
    id: 'Hanya jumlah — tanpa id pesanan, nominal, atau data pembeli.',
  },
  'amount-mismatch': { en: 'Amount mismatch', id: 'Jumlah tidak cocok' },
  'late-payment': { en: 'Paid after expiry or cancellation', id: 'Dibayar setelah kedaluwarsa/dibatalkan' },
  'double-payment': { en: 'Paid twice', id: 'Dibayar dua kali' },
  'fraud-challenge': { en: 'Fraud challenge', id: 'Tantangan kecurangan' },

  funnelViewed: { en: 'Product viewed', id: 'Produk dilihat' },
  funnelAdded: { en: 'Added to cart', id: 'Ditambahkan ke keranjang' },
  funnelCheckout: { en: 'Checkout started', id: 'Checkout dimulai' },
  funnelDelivery: { en: 'Delivery step completed', id: 'Langkah pengiriman selesai' },
  funnelPaid: { en: 'Paid', id: 'Dibayar' },
  funnelByDevice: { en: 'By device', id: 'Menurut perangkat' },
  device: { en: 'Device', id: 'Perangkat' },
  blockedByReason: { en: 'Checkout blocked, by reason', id: 'Checkout terhenti, menurut alasan' },
  'no-single-store': { en: 'No single store has every item', id: 'Tidak ada satu toko dengan semua barang' },
  'out-of-area': { en: 'Outside delivery reach', id: 'Di luar jangkauan pengiriman' },
  'out-of-stock': { en: 'Out of stock', id: 'Stok habis' },
  'price-changed': { en: 'Price changed', id: 'Harga berubah' },
  'code-refused': { en: 'Discount code refused', id: 'Kode diskon ditolak' },

  vitalsLcp: { en: 'LCP, p75 (s)', id: 'LCP, p75 (dtk)' },
  vitalsInp: { en: 'INP, p75 (ms)', id: 'INP, p75 (md)' },
  vitalsCls: { en: 'CLS, p75', id: 'CLS, p75' },
  samples: { en: 'Samples', id: 'Sampel' },
  pageType: { en: 'Page type', id: 'Jenis halaman' },
} as const satisfies Record<string, Pair>

export type CopyKey = keyof typeof COPY

export function text(language: string | undefined, key: CopyKey): string {
  const pair: Pair = COPY[key]
  return language === 'id' ? pair.id : pair.en
}

/** `text` with `{name}` placeholders filled. */
export function fill(
  language: string | undefined,
  key: CopyKey,
  values: Record<string, string | number>,
): string {
  return text(language, key).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''))
}

/** A key the data names (a channel, a device, a kind) in words, or the raw value if unknown. */
export function word(language: string | undefined, value: string): string {
  return value in COPY ? text(language, value as CopyKey) : value
}
