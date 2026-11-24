/**
 * The admin's words for C9's value lists (`@engine/media/contract`): the values are the
 * contract's, in its order; only the labels are written here. A value the contract adds without a
 * label here still shows, as its own name, and a test says which ones lack one.
 */
import {
  CAPTURE_TIERS,
  INTAKE_VERDICTS,
  MEDIA_PROVENANCES,
  MEDIA_ROLES,
  RETOUCHING_STATES,
} from '@engine/media/contract'

export type Option = { readonly label: string | { en: string; id: string }; readonly value: string }

export function optionsOf(
  values: readonly string[],
  labels: Readonly<Record<string, string | { en: string; id: string }>>,
): Option[] {
  return values.map((value) => {
    const label = labels[value] ?? value
    return {
      value,
      label: typeof label === 'string' ? { en: label, id: label } : label,
    }
  })
}

export const ROLE_LABELS: Readonly<Record<string, { en: string; id: string }>> = {
  recto: { en: 'Recto — the whole front', id: 'Recto — seluruh bagian depan' },
  verso: { en: 'Verso — the whole back', id: 'Verso — seluruh bagian belakang' },
  detail: { en: 'Detail', id: 'Detail' },
  raking: { en: 'Raking light', id: 'Cahaya menyamping' },
  transmitted: { en: 'Transmitted light', id: 'Cahaya tembus' },
  framed: { en: 'Framed or matted', id: 'Berbingkai atau bermat' },
  'in-room': { en: 'In a room', id: 'Di dalam ruangan' },
  scale: { en: 'To scale', id: 'Dengan skala' },
  flat: { en: 'Flat (a product)', id: 'Datar (produk)' },
  lifestyle: { en: 'In use (a product)', id: 'Sedang dipakai (produk)' },
  packaging: { en: 'Gift wrap and parcel', id: 'Bungkus hadiah dan paket' },
  showroom: { en: 'In the showroom', id: 'Di ruang pamer' },
  editorial: {
    en: 'Editorial — a story, a banner, a portrait',
    id: 'Editorial — cerita, banner, atau potret',
  },
  reference: {
    en: 'Reference frame — grey board or colour card, never published',
    id: 'Bingkai referensi — papan abu-abu atau kartu warna, tidak pernah diterbitkan',
  },
}

export const PROVENANCE_LABELS: Readonly<Record<string, { en: string; id: string }>> = {
  photograph: { en: 'Photograph of the real thing', id: 'Foto dari benda aslinya' },
  composite: {
    en: 'Composite — a photograph with something placed in it',
    id: 'Komposit — foto dengan sesuatu yang ditambahkan ke dalamnya',
  },
  rendered: { en: 'Rendered or drawn', id: 'Hasil render atau gambar' },
  'ai-generated': { en: 'AI-generated', id: 'Dibuat AI' },
}

export const TIER_LABELS: Readonly<Record<string, { en: string; id: string }>> = {
  good: { en: 'Good — a phone and a window', id: 'Cukup — ponsel dan jendela' },
  better: {
    en: 'Better — a camera, lamps, a colour card',
    id: 'Lebih baik — kamera, lampu, kartu warna',
  },
  best: {
    en: 'Best — a copy stand and a colour chart',
    id: 'Terbaik — copy stand dan bagan warna',
  },
}

export const VERDICT_LABELS: Readonly<Record<string, { en: string; id: string }>> = {
  pass: { en: 'Pass', id: 'Lolos' },
  'fix-owner': {
    en: 'Re-take needed — design work only, never published under its role',
    id: 'Perlu diambil ulang — hanya untuk kerja desain, tidak pernah diterbitkan dengan perannya',
  },
  legacy: {
    en: 'Legacy — assessed, not held to the spec',
    id: 'Warisan — sudah dinilai, tidak mengikuti spek',
  },
}

export const RETOUCHING_LABELS: Readonly<Record<string, { en: string; id: string }>> = {
  none: { en: 'None', id: 'Tidak ada' },
  unknown: { en: 'Unknown (a legacy image)', id: 'Tidak diketahui (gambar warisan)' },
  'retouched-legacy': {
    en: 'Retouched before us — on the re-shoot list',
    id: 'Diretus sebelum kami — masuk daftar pemotretan ulang',
  },
}

export const ROLE_OPTIONS = optionsOf(MEDIA_ROLES, ROLE_LABELS)
export const PROVENANCE_OPTIONS = optionsOf(MEDIA_PROVENANCES, PROVENANCE_LABELS)
export const TIER_OPTIONS = optionsOf(CAPTURE_TIERS, TIER_LABELS)
export const VERDICT_OPTIONS = optionsOf(INTAKE_VERDICTS, VERDICT_LABELS)
export const RETOUCHING_OPTIONS = optionsOf(RETOUCHING_STATES, RETOUCHING_LABELS)
