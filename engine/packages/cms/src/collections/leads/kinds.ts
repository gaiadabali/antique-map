import type { User } from 'payload'

export const LEAD_KINDS = ['ask', 'sell', 'partnership', 'contact', 'chat'] as const
export type LeadKind = (typeof LEAD_KINDS)[number]

export const LEAD_KIND_LABELS: Record<LeadKind, { en: string; id: string }> = {
  ask: { en: 'Ask about an item', id: 'Tanya tentang barang' },
  sell: { en: 'Sell to us', id: 'Jual kepada kami' },
  partnership: { en: 'Partnership', id: 'Kemitraan' },
  contact: { en: 'General contact', id: 'Kontak umum' },
  chat: { en: 'From chat', id: 'Dari chat' },
}

export const SOURCES = ['chat', 'form', 'page'] as const
export type LeadSource = (typeof SOURCES)[number]

export const SOURCE_LABELS: Record<LeadSource, { en: string; id: string }> = {
  chat: { en: 'Chat', id: 'Chat' },
  form: { en: 'Form', id: 'Formulir' },
  page: { en: 'Page', id: 'Halaman' },
}

export const LEAD_STATUSES = ['new', 'contacted', 'in_progress', 'closed', 'spam'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_LABELS: Record<LeadStatus, { en: string; id: string }> = {
  new: { en: 'New', id: 'Baru' },
  contacted: { en: 'Contacted', id: 'Sudah dihubungi' },
  in_progress: { en: 'In progress', id: 'Sedang diproses' },
  closed: { en: 'Closed', id: 'Ditutup' },
  spam: { en: 'Spam', id: 'Spam' },
}

export const LEAD_STATUS_HISTORY_LABELS = LEAD_STATUS_LABELS

export type StatusHistoryRow = {
  status?: LeadStatus | null
  by?: number | string | User | null
  at?: string | Date | null
}
