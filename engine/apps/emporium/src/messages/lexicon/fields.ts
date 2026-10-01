/**
 * Form fields (TASKS.md 6.3.h): each C2 `EntryFieldVM` and `CheckboxFieldVM`'s label, keyed by
 * the field's own `name` — its dotted path in the request it posts
 * (view-models/src/surfaces/form-fields.ts) — so a component reads `t(field.name)`; its hint,
 * where the app gives it one, is `${name}Hint`, the pattern of `checkout.fullNameHint`; and a
 * fieldset's legend is keyed by its `group` (`business`, `contact`, `consent`). A select's options
 * are `${name}.${value}` (`business.shopType.hotel`, `./account`) or a region named by
 * `Intl.DisplayNames`. Hidden fields (`returnTo`, `contact.locale`, a quote's `lines.0.productId`)
 * are never shown, so they have no label. An optional field is marked by `form.optional`, never
 * in its label.
 * Keys and neutral defaults only — the words are the brand’s (`../keys.ts`).
 */
import { defineMessages } from '@engine/i18n'

export const FIELD_KEYS = defineMessages({
  // the fieldsets' legends (C2 `Grouped.group`)
  business: 'Your business',
  contact: 'Your details',
  consent: 'What you agree to',
  // a buyer's or a partner's contact, as the C6 requests name it (fixtures/_forms.ts)
  'contact.fullName': 'Full name',
  'contact.email': 'Email',
  'contact.emailHint': 'We reply to this address.',
  'contact.whatsapp': 'WhatsApp number',
  'contact.whatsappHint': 'Include the country code.',
  // the Partnership application (C6 `RetailerApplyRequest`; the `partnership` fixture)
  'business.name': 'Business name',
  'business.shopType': 'Type of business',
  'business.country': 'Country',
  'business.address': 'Business address',
  'business.npwp': 'NPWP',
  'business.taxNumber': 'Tax number',
  'business.taxNumberHint': 'Your country’s own tax number, where the NPWP does not apply.',
  'business.website': 'Website',
  'business.message': 'Tell us about your business',
  'business.messageHint': 'Where it is, who buys there, and which designs you have in mind.',
  'consent.application': 'Contact me about this application only',
  // a field required only while another holds a value (C2 `EntryFieldVM.requiredWhen`), the
  // value named by `Intl.DisplayNames`: the NPWP while `business.country` is `ID`
  'message.fieldRequiredWhen': 'Required for {value}',
  // a partner's quote (C6 `quote.request`; the `form` fixture's `formQuotePartner`)
  'lines.0.quantity': 'Quantity',
  neededBy: 'Needed by',
  neededByHint: 'If you have a deadline.',
})
