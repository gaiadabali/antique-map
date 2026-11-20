/**
 * The checkout form's posted values, echoed back on a refusal — never a price — so a refused
 * submit keeps what the buyer typed instead of losing it to React 19's post-action form reset
 * (6-followup-4 #3). Pure `FormData` parsing only, no cookies or database, so it is plain to
 * unit-test without the server action's `server-only` import.
 */
export type CheckoutFormValues = {
  readonly name: string
  readonly whatsapp: string
  readonly email: string
  readonly address: string
  readonly notes: string
  readonly giftNote: string
  readonly lat: number | null
  readonly lng: number | null
}

const text = (value: FormDataEntryValue | null): string => (typeof value === 'string' ? value : '')

function coordinate(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : null
}

/** The submitted fields, as typed — never the server's parsed/normalised details. */
export function valuesFromForm(formData: FormData): CheckoutFormValues {
  return {
    name: text(formData.get('name')),
    whatsapp: text(formData.get('whatsapp')),
    email: text(formData.get('email')),
    address: text(formData.get('address')),
    notes: text(formData.get('notes')),
    giftNote: text(formData.get('giftNote')),
    lat: coordinate(formData.get('lat')),
    lng: coordinate(formData.get('lng')),
  }
}
