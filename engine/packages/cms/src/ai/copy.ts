/**
 * The drafting button's words (TASKS.md 8.3 item 4), both languages for every key (AGENTS.md:
 * copy lives in keyed lexicon files). The refusals are the route's codes (`./http`) in plain words.
 */
import { AI_DRAFTABLE_LABELS, type AiDraftableField } from '../collections/works/vocabulary'
import type { DraftRefusal } from './draft'
import type { SkipReason } from './plan'

export type Language = 'en' | 'id'
type Bilingual = { readonly en: string; readonly id: string }

export const DRAFT_COPY = {
  button: { en: 'Draft from photographs', id: 'Buat draf dari foto' },
  intro: {
    en: 'An AI drafts the empty fields from this antique’s photographs. Save your changes first. Every drafted field must be checked and ticked Verified before the antique can publish.',
    id: 'AI membuat draf bidang yang kosong dari foto antik ini. Simpan perubahan Anda dulu. Setiap bidang yang didraf harus diperiksa dan dicentang Diverifikasi sebelum antik ini dapat diterbitkan.',
  },
  working: {
    en: 'Drafting from the photographs… this can take a minute.',
    id: 'Membuat draf dari foto… ini bisa memakan waktu satu menit.',
  },
  done: { en: 'Draft saved as a new version.', id: 'Draf disimpan sebagai versi baru.' },
  filled: { en: 'Filled, to check', id: 'Diisi, perlu diperiksa' },
  none: { en: 'Nothing was filled.', id: 'Tidak ada yang diisi.' },
  skipped: { en: 'Left as they were', id: 'Dibiarkan seperti semula' },
  description: { en: 'Suggested description', id: 'Saran deskripsi' },
  unmatched: {
    en: 'Suggested, but not in the vocabulary (create them yourself if they are right)',
    id: 'Disarankan, tetapi tidak ada di kosakata (buat sendiri bila memang benar)',
  },
  reload: { en: 'Show the drafted fields', id: 'Tampilkan bidang yang didraf' },
  failed: {
    en: 'The drafting service did not answer. Try again in a moment.',
    id: 'Layanan draf tidak menjawab. Coba lagi sebentar lagi.',
  },
} as const satisfies Record<string, Bilingual>

export const SKIP_COPY: Record<SkipReason, Bilingual> = {
  filled: { en: 'already filled in', id: 'sudah diisi' },
  empty: { en: 'nothing to suggest', id: 'tidak ada saran' },
  no_field: { en: 'not on the record yet — see the suggestion', id: 'belum ada di catatan — lihat sarannya' },
  no_match: { en: 'no matching entry in the vocabulary', id: 'tidak ada entri yang cocok di kosakata' },
  no_scale: { en: 'no ruler or scale in the photographs', id: 'tidak ada penggaris atau skala di foto' },
  invalid: { en: 'the suggestion was not usable', id: 'sarannya tidak dapat dipakai' },
}

export const REFUSAL_COPY: Record<DraftRefusal | 'bad_request' | 'unavailable', Bilingual> = {
  bad_request: { en: 'Save the antique first.', id: 'Simpan antik ini dulu.' },
  not_signed_in: { en: 'Sign in again, then retry.', id: 'Masuk lagi, lalu coba kembali.' },
  not_allowed: {
    en: 'Only the owner or an editor can draft from photographs.',
    id: 'Hanya pemilik atau editor yang dapat membuat draf dari foto.',
  },
  disabled: {
    en: 'Drafting is switched off in the site settings.',
    id: 'Pembuatan draf dimatikan di pengaturan situs.',
  },
  not_found: { en: 'This antique was not found.', id: 'Antik ini tidak ditemukan.' },
  no_photographs: {
    en: 'Add at least one photograph (with its resized copies made) first.',
    id: 'Tambahkan setidaknya satu foto (dengan salinan ukurannya sudah dibuat) dulu.',
  },
  busy: {
    en: 'A draft for this antique is already running.',
    id: 'Draf untuk antik ini sedang berjalan.',
  },
  rate_limited: {
    en: 'You have reached 20 drafts this hour. Try again later.',
    id: 'Anda sudah mencapai 20 draf dalam satu jam ini. Coba lagi nanti.',
  },
  model_refused: {
    en: 'The AI declined to draft from these photographs. Nothing was changed.',
    id: 'AI menolak membuat draf dari foto ini. Tidak ada yang diubah.',
  },
  unusable_reply: {
    en: 'The AI’s answer could not be used. Nothing was changed.',
    id: 'Jawaban AI tidak dapat dipakai. Tidak ada yang diubah.',
  },
  model_failed: DRAFT_COPY.failed,
  not_saved: {
    en: 'The draft could not be saved: the antique has a problem to fix first. Nothing was changed.',
    id: 'Draf tidak dapat disimpan: ada masalah pada antik ini yang perlu diperbaiki dulu. Tidak ada yang diubah.',
  },
  unavailable: DRAFT_COPY.failed,
}

export function fieldName(field: AiDraftableField, language: Language): string {
  return AI_DRAFTABLE_LABELS[field]?.[language] ?? field
}
