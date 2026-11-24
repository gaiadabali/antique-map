/**
 * The privacy page's first words, seeded once into the CMS (`./privacy`, `../pages`), where the
 * owner edits them like any page. A plain, general notice of what the shop does with personal data
 * (orders, enquiries, the newsletter, the chat, the site's own cookies), written for Indonesia's
 * personal data protection law (UU PDP, Law 27 of 2022). It is a starting text, not legal advice:
 * the owner's counsel reviews it before launch.
 */
import type { SiteLocale } from '@engine/config/sites'

export type PrivacySection = { readonly title: string; readonly paragraphs: readonly string[] }
export type PrivacyText = {
  readonly title: string
  readonly intro: readonly string[]
  readonly sections: readonly PrivacySection[]
}

const EN: PrivacyText = {
  title: 'Privacy policy',
  intro: [
    'Old East Indies ("we", "us") sells prints and gifts made from antique originals, online and through shops in Bali. This policy explains what personal data we collect when you use this website, why we collect it, and the choices you have.',
    'Last updated: 24 November 2026.',
  ],
  sections: [
    {
      title: 'What we collect',
      paragraphs: [
        'When you order: your name, WhatsApp number, email address, delivery address and the map pin you place, and what you bought.',
        'When you send an enquiry or join our newsletter: the details you type in the form, such as your name, email address, business and message, and your consent.',
        'When you use the chat: the messages you write, so the assistant can answer you.',
        'When you browse: anonymous statistics about which pages are visited, without advertising or tracking cookies.',
      ],
    },
    {
      title: 'Why we use it',
      paragraphs: [
        'To take, deliver and support your order; to answer your enquiry; to send the newsletter you asked for; to keep the site secure and working; and to understand which pages are useful so we can improve them.',
        'We do not sell your personal data, and we do not use it for advertising profiles.',
      ],
    },
    {
      title: 'Who we share it with',
      paragraphs: [
        'Only with the services that help us run the shop, and only what they need: our payment provider, which processes your payment (we never see or store your card details); the courier that delivers your order (your name, phone number and address); the store that fulfils it; our hosting and email providers; Cloudflare Turnstile, which protects our forms from spam; and our AI provider, when you use the chat.',
        'We may also share data when the law requires it.',
      ],
    },
    {
      title: 'Cookies',
      paragraphs: [
        'We use only the cookies the site needs: to remember your bag, to keep partners signed in, and to protect forms from abuse. We do not use advertising cookies. A small note in your browser also remembers that you have already seen the newsletter pop-up.',
      ],
    },
    {
      title: 'How long we keep it',
      paragraphs: [
        'Order records are kept for as long as the law requires for tax and accounting. Enquiries are kept for up to 24 months after they are closed. Newsletter details are kept until you unsubscribe. Chat conversations are deleted after a short period.',
      ],
    },
    {
      title: 'Your rights',
      paragraphs: [
        'You may ask to see the personal data we hold about you, to correct it, to delete it, or to withdraw a consent you gave, such as for the newsletter. You can unsubscribe from the newsletter at any time with the link in each email. To make a request, contact us using the details below; we answer within the time the law sets.',
      ],
    },
    {
      title: 'Security',
      paragraphs: [
        'We protect your data with encrypted connections, access limited to the people who need it, and providers that keep their own security standards. No system is perfectly secure, but we work to keep your data safe and will tell you and the authorities if a breach puts it at risk.',
      ],
    },
    {
      title: 'Changes and contact',
      paragraphs: [
        'We may update this policy; the date at the top shows the latest version.',
        'Questions about your personal data? Write to us on WhatsApp or by email, using the contact details at the top and bottom of this site.',
      ],
    },
  ],
}

const ID: PrivacyText = {
  title: 'Kebijakan privasi',
  intro: [
    'Old East Indies ("kami") menjual cetakan dan hadiah yang dibuat dari karya antik asli, secara online dan melalui toko-toko di Bali. Kebijakan ini menjelaskan data pribadi apa yang kami kumpulkan saat Anda memakai situs ini, untuk apa, dan pilihan yang Anda miliki.',
    'Terakhir diperbarui: 24 November 2026.',
  ],
  sections: [
    {
      title: 'Data yang kami kumpulkan',
      paragraphs: [
        'Saat Anda memesan: nama, nomor WhatsApp, alamat email, alamat pengiriman dan titik peta yang Anda pilih, serta barang yang Anda beli.',
        'Saat Anda mengirim pertanyaan atau berlangganan buletin: data yang Anda isi di formulir, seperti nama, alamat email, usaha dan pesan Anda, serta persetujuan Anda.',
        'Saat Anda memakai chat: pesan yang Anda tulis, agar asisten dapat menjawab Anda.',
        'Saat Anda menjelajah: statistik anonim tentang halaman yang dikunjungi, tanpa cookie iklan atau pelacak.',
      ],
    },
    {
      title: 'Untuk apa kami memakainya',
      paragraphs: [
        'Untuk memproses, mengirim dan melayani pesanan Anda; menjawab pertanyaan Anda; mengirim buletin yang Anda minta; menjaga situs tetap aman dan berfungsi; serta memahami halaman mana yang berguna agar dapat kami perbaiki.',
        'Kami tidak menjual data pribadi Anda dan tidak memakainya untuk profil iklan.',
      ],
    },
    {
      title: 'Dengan siapa kami membagikannya',
      paragraphs: [
        'Hanya dengan layanan yang membantu kami menjalankan toko, dan hanya data yang mereka perlukan: penyedia pembayaran yang memproses pembayaran Anda (kami tidak pernah melihat atau menyimpan data kartu Anda); kurir yang mengantar pesanan (nama, nomor telepon dan alamat Anda); toko yang memenuhi pesanan; penyedia hosting dan email kami; Cloudflare Turnstile, yang melindungi formulir kami dari spam; dan penyedia AI kami, saat Anda memakai chat.',
        'Kami juga dapat membagikan data bila diwajibkan oleh hukum.',
      ],
    },
    {
      title: 'Cookie',
      paragraphs: [
        'Kami hanya memakai cookie yang dibutuhkan situs: untuk mengingat keranjang Anda, menjaga mitra tetap masuk, dan melindungi formulir dari penyalahgunaan. Kami tidak memakai cookie iklan. Sebuah catatan kecil di browser Anda juga mengingat bahwa Anda sudah melihat pop-up buletin.',
      ],
    },
    {
      title: 'Berapa lama kami menyimpannya',
      paragraphs: [
        'Data pesanan disimpan selama diwajibkan hukum untuk keperluan pajak dan pembukuan. Pertanyaan disimpan hingga 24 bulan setelah ditutup. Data buletin disimpan sampai Anda berhenti berlangganan. Percakapan chat dihapus setelah waktu yang singkat.',
      ],
    },
    {
      title: 'Hak Anda',
      paragraphs: [
        'Anda dapat meminta untuk melihat data pribadi Anda yang kami simpan, memperbaikinya, menghapusnya, atau menarik persetujuan yang pernah Anda berikan, misalnya untuk buletin. Anda dapat berhenti berlangganan buletin kapan saja melalui tautan di setiap email. Untuk mengajukan permintaan, hubungi kami melalui kontak di bawah; kami menjawab dalam jangka waktu yang ditetapkan hukum.',
      ],
    },
    {
      title: 'Keamanan',
      paragraphs: [
        'Kami melindungi data Anda dengan koneksi terenkripsi, akses yang terbatas pada orang yang memerlukannya, dan penyedia yang menjaga standar keamanan mereka sendiri. Tidak ada sistem yang sepenuhnya aman, tetapi kami berupaya menjaga data Anda dan akan memberi tahu Anda serta pihak berwenang bila terjadi kebocoran yang membahayakannya.',
      ],
    },
    {
      title: 'Perubahan dan kontak',
      paragraphs: [
        'Kami dapat memperbarui kebijakan ini; tanggal di bagian atas menunjukkan versi terbaru.',
        'Ada pertanyaan tentang data pribadi Anda? Hubungi kami melalui WhatsApp atau email, memakai kontak di bagian atas dan bawah situs ini.',
      ],
    },
  ],
}

export function privacyText(locale: SiteLocale): PrivacyText {
  return locale === 'id' ? ID : EN
}
