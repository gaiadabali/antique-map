/**
 * What a partnership lead asks for (TASKS.md 28.1; the owner's feedback of 2026-11-19, F3): the
 * shop's partnership page offers two enquiries, "Become a retailer" and "Customised wholesale
 * products", and no retailer sign-up. The lead service writes the one the visitor's form names;
 * the owner reads it in the sidebar. Shown on partnership leads only; empty on older ones.
 */
import type { Field } from 'payload'

export const PARTNERSHIP_TYPES = ['retailer', 'wholesale'] as const
export type PartnershipType = (typeof PARTNERSHIP_TYPES)[number]

export const PARTNERSHIP_TYPE_LABELS: Readonly<
  Record<PartnershipType, { en: string; id: string }>
> = {
  retailer: { en: 'Become a retailer', id: 'Menjadi pengecer' },
  wholesale: { en: 'Customised wholesale products', id: 'Produk grosir khusus' },
}

export const partnershipTypeField: Field = {
  name: 'partnershipType',
  type: 'select',
  label: { en: 'Partnership enquiry', id: 'Jenis kemitraan' },
  options: PARTNERSHIP_TYPES.map((value) => ({ value, label: PARTNERSHIP_TYPE_LABELS[value] })),
  admin: {
    position: 'sidebar',
    condition: (data) => (data as { kind?: unknown } | undefined)?.kind === 'partnership',
    description: {
      en: 'Which of the two partnership enquiries the person sent.',
      id: 'Jenis pertanyaan kemitraan yang dikirim orang ini.',
    },
  },
}
