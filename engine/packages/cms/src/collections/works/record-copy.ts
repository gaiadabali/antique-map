/**
 * The record fields' bilingual admin copy (TASKS.md 3.6.a): what each field asks the cataloguer
 * for, in both of the admin's languages. Kept beside `fields-record.ts` so the field shapes stay
 * readable there and the file holds to the 300-line rule.
 */
import { IN_DEFAULT_LOCALE_NOTE } from '../../fields/validate'

export const RECORD_NOTES = {
  publicId: {
    en: 'Made when the work is first saved — the old site’s product id for a migrated work, otherwise from 100000 — and never changed: the item’s address carries it.',
    id: 'Dibuat saat karya pertama kali disimpan — id produk situs lama untuk karya migrasi, jika tidak mulai dari 100000 — dan tidak pernah berubah: alamat itemnya membawanya.',
  },
  workUid: {
    en: 'Made when the work is first saved, and never changed: redirects key on it.',
    id: 'Dibuat saat karya pertama kali disimpan, dan tidak pernah berubah: kunci pengalihan menggunakannya.',
  },
  stockNumber: {
    en: 'The gallery’s own number: M.1044, P.2098.',
    id: 'Nomor milik galeri: M.1044, P.2098.',
  },
  title: {
    en: `The hook title buyers read: "Bali by François Valentijn, 1726 — the first large-scale map of the island". Needed to publish. ${IN_DEFAULT_LOCALE_NOTE.en}`,
    id: `Judul yang dibaca pembeli: "Bali by François Valentijn, 1726 — the first large-scale map of the island". Diperlukan untuk menerbitkan. ${IN_DEFAULT_LOCALE_NOTE.id}`,
  },
  originalTitle: {
    en: 'As printed, letter for letter: Kaart van het Eyland Bali.',
    id: 'Seperti tercetak, huruf demi huruf: Kaart van het Eyland Bali.',
  },
  originalTitleLanguage: {
    en: 'Its language: nl, la, ms.',
    id: 'Bahasanya: nl, la, ms.',
  },
  objectType: {
    en: 'What kind of object it is: it decides the HS code and how the page reads.',
    id: 'Jenis objeknya: menentukan kode HS dan cara halaman membacanya.',
  },
  date: {
    en: 'When this sheet was printed or issued. Needed to publish.',
    id: 'Ketika lembar ini dicetak atau diterbitkan. Diperlukan untuk menerbitkan.',
  },
  firstEdition: {
    en: 'When the work first appeared, if earlier.',
    id: 'Ketika karya ini pertama kali muncul, jika lebih awal.',
  },
  dateOnPlate: {
    en: 'The date the plate itself bears, if any.',
    id: 'Tanggal yang tertera pada pelat itu sendiri, jika ada.',
  },
  publication: {
    en: 'As the imprint and the book it came from say.',
    id: 'Seperti yang tertulis pada impresum dan buku asalnya.',
  },
  publicationPlace: {
    en: 'Amsterdam',
    id: 'Amsterdam',
  },
  publicationPublisher: {
    en: 'As printed',
    id: 'Seperti tercetak',
  },
  sourceWork: {
    en: 'From: Oud en Nieuw Oost-Indiën, 1724–26.',
    id: 'Dari: Oud en Nieuw Oost-Indiën, 1724–26.',
  },
  textLanguage: {
    en: 'Of the printed text: nl, la.',
    id: 'Dari teks tercetak: nl, la.',
  },
  verso: {
    en: '"Verso: blank", or the text printed on the back.',
    id: '"Verso: kosong", atau teks yang tercetak di bagian belakang.',
  },
  book: {
    en: 'A volume’s collation.',
    id: 'Kolasi sebuah volume.',
  },
  bookOpenings: {
    en: 'Photographs of spreads, in order.',
    id: 'Foto penyebaran, berurutan.',
  },
  status: {
    en: 'Whether the antique is on offer. Set it; never imply it.',
    id: 'Apakah barang antik ini dijual. Atur nilainya; jangan mengandaikan.',
  },
  location: {
    en: 'Where the object sits, Singapore or Jakarta. Blank until the owner says: it never blocks publishing.',
    id: 'Di mana objek disimpan, Singapura atau Jakarta. Kosong sampai pemiliknya menentukan: tidak pernah menghalangi penerbitan.',
  },
} as const
