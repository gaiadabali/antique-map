/**
 * Copy for the leads inbox and the lead/partner admin views (TASKS.md 9.1.a–b;
 * CONTENT-OPERATIONS.md §4.1–§4.2). Every key is bilingual (AGENTS.md: "Copy lives in keyed
 * lexicon files, never in components").
 */
export type Language = 'en' | 'id'
export type Bilingual = { readonly en: string; readonly id: string }

function t<K extends string>(entries: Record<K, Bilingual>): Record<K, Bilingual> {
  return entries
}

export const LEADS_COPY = t({
  refusalNotOwner: {
    en: 'Only the owner opens the leads inbox.',
    id: 'Hanya pemilik yang dapat membuka kotak masuk calon pembeli.',
  },
  // Not "Leads": the collection's own sidebar entry is that, and two entries of one name
  // were indistinguishable (10.4 proxy run).
  inboxTitle: { en: 'Leads inbox', id: 'Kotak masuk calon pembeli' },
  replyTitle: { en: 'Reply to this person', id: 'Balas orang ini' },
  replyWhatsapp: { en: 'Reply on WhatsApp', id: 'Balas lewat WhatsApp' },
  replyEmail: { en: 'Reply by email', id: 'Balas lewat email' },
  replyHint: {
    en: 'Opens WhatsApp or your email app with a short opening line written. Edit it before you send, then set the status to Contacted below.',
    id: 'Membuka WhatsApp atau aplikasi email dengan kalimat pembuka singkat. Ubah sebelum dikirim, lalu ubah status menjadi Sudah dihubungi di bawah.',
  },
  replyNoContact: {
    en: 'This lead left no WhatsApp number or email address to reply to.',
    id: 'Calon pembeli ini tidak meninggalkan nomor WhatsApp atau alamat email.',
  },
  filterSite: { en: 'Site', id: 'Situs' },
  filterKind: { en: 'Kind', id: 'Jenis' },
  filterStatus: { en: 'Status', id: 'Status' },
  filterAll: { en: 'All', id: 'Semua' },
  filterApply: { en: 'Filter', id: 'Saring' },
  emptyList: { en: 'No leads here right now.', id: 'Belum ada calon pembeli di sini.' },
  noMessage: { en: 'No message.', id: 'Tidak ada pesan.' },
  pagePrev: { en: '← Newer', id: '← Lebih baru' },
  pageNext: { en: 'Older →', id: 'Lebih lama →' },
  pageOf: { en: 'Page', id: 'Halaman' },
  sourceTitle: { en: 'Open the source', id: 'Buka sumbernya' },
  sourceNone: {
    en: 'No item or chat attached.',
    id: 'Tidak ada barang atau chat yang dilampirkan.',
  },
  sourceItemsLabel: { en: 'Items asked about', id: 'Barang yang ditanyakan' },
  sourcePublicPage: { en: 'Public page', id: 'Halaman publik' },
  sourceAdminPage: { en: 'Admin page', id: 'Halaman admin' },
  sourceChatLabel: { en: 'Chat session', id: 'Sesi chat' },
  createPartner: { en: 'Create partner', id: 'Buat mitra' },
  createPartnerDone: {
    en: 'A partner was created from this lead.',
    id: 'Mitra telah dibuat dari calon ini.',
  },
  createPartnerFailed: {
    en: 'Could not create the partner. Try again.',
    id: 'Tidak dapat membuat mitra. Coba lagi.',
  },
  partnerLeadsTitle: { en: 'Leads for this partner', id: 'Calon pembeli untuk mitra ini' },
  partnerLeadsEmpty: {
    en: 'No leads point to this partner yet.',
    id: 'Belum ada calon pembeli yang menunjuk ke mitra ini.',
  },
  ageJustNow: { en: 'just now', id: 'baru saja' },
})

export function L(key: keyof typeof LEADS_COPY, language: Language): string {
  const entry = LEADS_COPY[key]
  return entry[language] ?? entry.en
}
