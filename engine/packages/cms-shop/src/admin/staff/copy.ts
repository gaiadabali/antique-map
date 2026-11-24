/**
 * The quick "Add a staff member" screen's words (TASKS.md 27.6.c), keyed, in both admin languages
 * (Anda register). The rules' own messages (the email taken, a short password) come from the
 * `users` collection and are shown as they arrive.
 */
type Pair = { readonly en: string; readonly id: string }

export const STAFF_COPY = {
  addButton: { en: 'Add a staff member', id: 'Tambah anggota staf' },
  title: { en: 'Add a staff member', id: 'Tambah anggota staf' },
  intro: {
    en: 'Choose their password and tell it to them: they sign in with this email and password, and can change it on their account page.',
    id: 'Pilih kata sandinya lalu beri tahu mereka: mereka masuk dengan email dan kata sandi ini, dan bisa menggantinya di halaman akun.',
  },
  refusal: { en: 'Only the owner adds staff.', id: 'Hanya pemilik yang menambah staf.' },
  role: { en: 'What they do', id: 'Tugasnya' },
  role_store: {
    en: 'Store staff — their store’s orders and stock',
    id: 'Staf toko — pesanan dan stok tokonya',
  },
  role_editor: {
    en: 'Editor — the catalogue, the content and every order',
    id: 'Editor — katalog, konten, dan semua pesanan',
  },
  role_owner: { en: 'Owner — everything', id: 'Pemilik — semuanya' },
  store: { en: 'Store', id: 'Toko' },
  storeFind: {
    en: 'Find the store: name, code or area',
    id: 'Cari toko: nama, kode, atau area',
  },
  storeCount: { en: '{count} stores match', id: '{count} toko cocok' },
  forStore: { en: 'Add staff for this store', id: 'Tambah staf untuk toko ini' },
  noStores: {
    en: 'There is no store yet: add one under Stores first.',
    id: 'Belum ada toko: tambahkan dulu di Toko.',
  },
  name: { en: 'Name', id: 'Nama' },
  email: { en: 'Email', id: 'Email' },
  password: { en: 'Password (at least 12 characters)', id: 'Kata sandi (minimal 12 karakter)' },
  save: { en: 'Add', id: 'Tambah' },
  saving: { en: 'Adding…', id: 'Menambah…' },
  added: {
    en: '{name} can now sign in with {email}.',
    id: '{name} sekarang bisa masuk dengan {email}.',
  },
  another: { en: 'Add someone else', id: 'Tambah orang lain' },
  open: { en: 'Open their account', id: 'Buka akunnya' },
  failed: {
    en: 'That did not work. Check the details and try again.',
    id: 'Gagal. Periksa isiannya dan coba lagi.',
  },
  network: {
    en: 'The admin could not be reached. Check the connection and try again.',
    id: 'Admin tidak terjangkau. Periksa koneksi dan coba lagi.',
  },
} as const satisfies Record<string, Pair>

export type StaffKey = keyof typeof STAFF_COPY

export function S(key: StaffKey, language: string | undefined, vars: Record<string, string> = {}) {
  const text = STAFF_COPY[key][language === 'id' ? 'id' : 'en']
  return text.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? '')
}
