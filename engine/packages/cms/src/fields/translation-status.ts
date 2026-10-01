/**
 * `translationStatus` (CONTENT-MODEL.md intro): per locale, how that locale's text came to be —
 * entered by hand, machine-translated, or reviewed. Machine translation is allowed and shown to
 * editors as such until reviewed (KOI). It is an editorial workflow flag, so it is staff-only:
 * never in a public response, and no view model reads it (`STAFF_ONLY_ACCESS`, senior-be review
 * of 8.1, N3). Only on collections with localised text.
 */
import type { SelectField } from 'payload'

import { STAFF_ONLY_ACCESS } from '../access/fields'

export const TRANSLATION_STATUSES = ['entered', 'machine', 'reviewed'] as const
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number]

const TRANSLATION_LABELS: Record<TranslationStatus, string> = {
  entered: 'Entered by hand',
  machine: 'Machine translation — not yet reviewed',
  reviewed: 'Reviewed',
}

export const translationStatusField: SelectField = {
  name: 'translationStatus',
  type: 'select',
  localized: true,
  required: true,
  defaultValue: 'entered',
  options: TRANSLATION_STATUSES.map((value) => ({ value, label: TRANSLATION_LABELS[value] })),
  access: STAFF_ONLY_ACCESS,
  admin: { position: 'sidebar' },
}
