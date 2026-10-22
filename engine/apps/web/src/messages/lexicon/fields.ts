/**
 * Form fields (TASKS.md 6.3.h): each C2 `EntryFieldVM` and `CheckboxFieldVM`'s label, keyed by
 * the field's own `name` — its dotted path in the request it posts
 * (view-models/src/surfaces/form-fields.ts) — so a component reads `t(field.name)`; its hint,
 * where the app gives it one, is `${name}Hint`, the pattern of `checkout.fullNameHint`; and a
 * fieldset's legend is keyed by its `group` (`contact`, `institution`, `consent`). Hidden fields
 * (`returnTo`, `contact.locale`, a quote's `lines.0.productId`) are never shown, so they have no
 * label. An optional field is marked by `form.optional`, never in its label.
 * Keys and neutral defaults only — the words are the brand’s (`../keys.ts`).
 */
import { defineMessages } from '@engine/i18n'

export const FIELD_KEYS = defineMessages({
  // the fieldsets' legends (C2 `Grouped.group`)
  contact: 'Your details',
  institution: 'Your institution',
  consent: 'What you agree to',
  // a buyer's contact, as every C6 lead request names it (fixtures/_forms.ts `contactFields`)
  'contact.fullName': 'Full name',
  'contact.email': 'Email',
  'contact.emailHint': 'We reply to this address.',
  'contact.whatsapp': 'WhatsApp number',
  'contact.whatsappHint': 'Include the country code.',
  // an institution's quote or proforma (C6 `quote.request`; the `form` fixture's `formQuote`)
  'institution.organisation': 'Organisation',
  'institution.taxId': 'Tax ID',
  'institution.taxIdHint': 'If your finance office needs it on the proforma.',
  'institution.poNumber': 'PO number',
  'institution.poNumberHint': 'If your finance office has issued one.',
  neededBy: 'Needed by',
  neededByHint: 'If you have a deadline.',
  // an offer's bid, in the ship-to market's currency (C2 FormVM `offer.currency`)
  proposal: 'Your offer',
  proposalHint: 'In {currency}. An offer is not binding.',
  // "Sell to us" (C6 `ConsignmentRequest`); the photo limits are C2 FormVM `uploads`
  description: 'About the work',
  descriptionHint: 'What it is, its size, and anything you know of where it came from.',
  photos: 'Photos',
  'photosHint.one': 'One photo, up to {size} MB.',
  'photosHint.other': 'Up to {count} photos, {size} MB each.',
})
