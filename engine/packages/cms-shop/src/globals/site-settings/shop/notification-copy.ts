/**
 * Every email the shop sends, with its default subject and opening in both languages — the
 * notifier's wording (`shop/notify/templates.ts`) when the emails became editable, except
 * `orderReceived`, which is new: the email for an order priced at checkout (the plan's K2), which
 * the notifier sends from TASKS.md 27.3 on. The key order is the admin's.
 */
type Bilingual = { en: string; id: string }

export type EmailCopy = {
  readonly label: Bilingual
  /** When it is sent, for the admin. */
  readonly when: Bilingual
  readonly subject: Bilingual
  readonly opening: Bilingual
}

const UPDATE_SUBJECT: Bilingual = {
  en: 'Order #{number} — update',
  id: 'Pesanan #{number} — pembaruan',
}

export const ORDER_EMAILS = {
  orderReceived: {
    label: { en: 'Order received', id: 'Pesanan diterima' },
    when: {
      en: 'To the buyer, when an order priced at checkout is placed.',
      id: 'Ke pembeli, saat pesanan yang ongkirnya dihitung saat checkout dibuat.',
    },
    subject: { en: 'Order #{number} — ready to pay', id: 'Pesanan #{number} — siap dibayar' },
    opening: {
      en: 'Thank you for your order. Pay with the link below to confirm it.',
      id: 'Terima kasih atas pesanan Anda. Bayar lewat tautan di bawah untuk mengonfirmasinya.',
    },
  },
  awaitingQuote: {
    label: { en: 'Waiting for a delivery price', id: 'Menunggu ongkos kirim' },
    when: {
      en: 'To the buyer, when an order needs staff to set its delivery fee.',
      id: 'Ke pembeli, saat ongkir pesanan perlu diisi staf.',
    },
    subject: UPDATE_SUBJECT,
    opening: {
      en: 'We’re confirming your delivery price — we’ll email you shortly with the total.',
      id: 'Kami sedang memastikan ongkos kirim Anda — kami akan mengirim email sebentar lagi dengan totalnya.',
    },
  },
  priceReady: {
    label: { en: 'Delivery price ready', id: 'Ongkos kirim siap' },
    when: {
      en: 'To the buyer, when staff have set the delivery fee.',
      id: 'Ke pembeli, saat staf sudah mengisi ongkir.',
    },
    subject: {
      en: 'Order #{number} — your delivery price is ready',
      id: 'Pesanan #{number} — ongkos kirim Anda sudah siap',
    },
    opening: { en: 'Your price is ready:', id: 'Harga Anda sudah siap:' },
  },
  paid: {
    label: { en: 'Paid', id: 'Dibayar' },
    when: {
      en: 'To the buyer, once the payment arrives.',
      id: 'Ke pembeli, setelah pembayaran masuk.',
    },
    subject: UPDATE_SUBJECT,
    opening: {
      en: 'We’ve received your payment — your order is being prepared.',
      id: 'Pembayaran Anda telah kami terima — pesanan sedang disiapkan.',
    },
  },
  processing: {
    label: { en: 'Being packed', id: 'Sedang dikemas' },
    when: {
      en: 'To the buyer, when the store starts packing.',
      id: 'Ke pembeli, saat toko mulai mengemas.',
    },
    subject: UPDATE_SUBJECT,
    opening: { en: 'Your order is being packed.', id: 'Pesanan Anda sedang dikemas.' },
  },
  waitingDriver: {
    label: { en: 'Waiting for a driver', id: 'Menunggu pengemudi' },
    when: { en: 'To the buyer, when the parcel is ready.', id: 'Ke pembeli, saat paket siap.' },
    subject: UPDATE_SUBJECT,
    opening: {
      en: 'Your order is ready and waiting for a driver.',
      id: 'Pesanan Anda siap dan menunggu pengemudi.',
    },
  },
  onTheWay: {
    label: { en: 'On the way', id: 'Dalam perjalanan' },
    when: {
      en: 'To the buyer, when a driver collects it.',
      id: 'Ke pembeli, saat pengemudi mengambilnya.',
    },
    subject: UPDATE_SUBJECT,
    opening: {
      en: 'Your order has been picked up and is on the way.',
      id: 'Pesanan Anda telah diambil dan sedang dalam perjalanan.',
    },
  },
  delivered: {
    label: { en: 'Delivered', id: 'Terkirim' },
    when: { en: 'To the buyer, once it is delivered.', id: 'Ke pembeli, setelah terkirim.' },
    subject: UPDATE_SUBJECT,
    opening: {
      en: 'Your order has been delivered. Thank you for shopping with us.',
      id: 'Pesanan Anda telah terkirim. Terima kasih telah berbelanja bersama kami.',
    },
  },
  cancelled: {
    label: { en: 'Cancelled', id: 'Dibatalkan' },
    when: {
      en: 'To the buyer, when an order is cancelled.',
      id: 'Ke pembeli, saat pesanan dibatalkan.',
    },
    subject: UPDATE_SUBJECT,
    opening: { en: 'Your order has been cancelled.', id: 'Pesanan Anda telah dibatalkan.' },
  },
  expired: {
    label: { en: 'Time to pay ran out', id: 'Waktu bayar habis' },
    when: {
      en: 'To the buyer, when the time to pay runs out.',
      id: 'Ke pembeli, saat batas waktu pembayaran habis.',
    },
    subject: UPDATE_SUBJECT,
    opening: {
      en: 'The time to pay for your order has run out.',
      id: 'Batas waktu pembayaran pesanan Anda telah berakhir.',
    },
  },
  trackingLink: {
    label: { en: 'Tracking link', id: 'Tautan pelacakan' },
    when: {
      en: 'To a buyer who asks for their link again (“Find my order”).',
      id: 'Ke pembeli yang meminta tautannya lagi (“Cari pesanan saya”).',
    },
    subject: { en: 'Your tracking link', id: 'Tautan pelacakan Anda' },
    opening: {
      en: 'Here is the link to follow your order:',
      id: 'Berikut tautan untuk memantau pesanan Anda:',
    },
  },
  storeNewOrder: {
    label: { en: 'Store: new paid order', id: 'Toko: pesanan baru dibayar' },
    when: {
      en: 'To the staff of the sending store, once an order is paid. Staff get both languages.',
      id: 'Ke staf toko pengirim, setelah pesanan dibayar. Staf menerima kedua bahasa.',
    },
    subject: { en: 'New order #{number} — {store}', id: 'Pesanan baru #{number} — {store}' },
    opening: {
      en: 'New paid order #{number} for {store}',
      id: 'Pesanan #{number} yang sudah dibayar untuk {store}',
    },
  },
  storeReassigned: {
    label: { en: 'Store: order moved to you', id: 'Toko: pesanan dipindah ke Anda' },
    when: {
      en: 'To the staff of a store an order is moved to. Staff get both languages.',
      id: 'Ke staf toko tujuan saat pesanan dipindah. Staf menerima kedua bahasa.',
    },
    subject: {
      en: 'Order #{number} reassigned — {store}',
      id: 'Pesanan #{number} dipindahkan — {store}',
    },
    opening: {
      en: 'Order #{number} has been reassigned to {store}',
      id: 'Pesanan #{number} telah dipindahkan ke {store}',
    },
  },
} as const satisfies Record<string, EmailCopy>

export type OrderEmail = keyof typeof ORDER_EMAILS
