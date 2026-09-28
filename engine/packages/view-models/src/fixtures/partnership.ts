/**
 * @contract C2 — fixtures `partnership` (visitor, applied, declined, approved, retailer) · owner: ARC
 *
 * A fictional shop's trade page (D31): resellers apply for an account, companies and hotels
 * ask for a quote, and the last section is the application and partner sign-in. Then the
 * same page for someone who has just applied, for a declined applicant (who may apply again),
 * for an approved one back through the status link before setting a password, and for an
 * approved retailer who is signed in. No state shows a trade price: the published terms are
 * words. The shop's field names are C6 `RetailerApplyRequest`'s; the quotes', `QuoteRequest`'s.
 */
import type { RetailerShopType } from '@engine/domain/api'

import type { FormFieldVM } from '../surfaces/form'
import type {
  PartnershipAccessVM,
  PartnershipApplyVM,
  PartnershipPathVM,
  PartnershipSignInVM,
  PartnershipVM,
} from '../surfaces/partnership'
import { seo, streamed } from './_shared'

const field = (name: string, input: FormFieldVM['input'], required = true): FormFieldVM => ({
  name,
  input,
  required,
  autocomplete: null,
  options: [],
  maxLength: null,
  value: null,
})
const select = (name: string, labels: Readonly<Record<string, string>>): FormFieldVM => ({
  ...field(name, 'select'),
  options: Object.entries(labels).map(([value, label]) => ({ value, label })),
})
const optional = (name: string, input: FormFieldVM['input']) => field(name, input, false)

/** Every kind of shop C6 takes (`RETAILER_SHOP_TYPES`), none left out. */
const SHOP_TYPES = {
  'souvenir-shop': 'A souvenir shop',
  'gift-shop': 'A gift shop',
  gallery: 'A gallery',
  bookshop: 'A bookshop',
  'hotel-boutique': 'A hotel boutique',
  'museum-shop': 'A museum shop',
  'concept-store': 'A concept store',
  other: 'Something else',
} as const satisfies Record<RetailerShopType, string>
const COUNTRIES = { ID: 'Indonesia', SG: 'Singapore', AU: 'Australia', NL: 'The Netherlands' }

const person = [
  field('contact.fullName', 'text'),
  field('contact.email', 'email'),
  optional('contact.whatsapp', 'tel'),
  { ...field('contact.locale', 'hidden'), value: 'en' },
]
const shop: PartnershipPathVM = {
  audience: 'shop',
  label: 'A shop',
  outcome: 'account',
  fields: [
    field('business.name', 'text'),
    select('business.shopType', SHOP_TYPES),
    { ...select('business.country', COUNTRIES), value: 'ID' },
    field('business.address', 'textarea'),
    // Required in Indonesia (the server checks it, with its hint saying so); abroad, a tax number.
    { ...optional('business.npwp', 'text'), maxLength: 20 },
    optional('business.taxNumber', 'text'),
    optional('business.website', 'text'),
    optional('business.message', 'textarea'),
    ...person,
    field('consent.application', 'checkbox'),
    optional('consent.marketingEmail', 'checkbox'),
    optional('consent.marketingWhatsapp', 'checkbox'),
  ],
  action: '/api/x/commerce/retailers/applications',
}
const quote = (audience: 'company' | 'hospitality', label: string): PartnershipPathVM => ({
  audience,
  label,
  outcome: 'quote',
  fields: [
    field('institution.organisation', 'text'),
    field('message', 'textarea'),
    optional('neededBy', 'date'),
    ...person,
    optional('contact.consents.marketingEmail', 'checkbox'),
    optional('contact.consents.marketingWhatsapp', 'checkbox'),
  ],
  action: '/api/x/commerce/quotes',
})
const apply: PartnershipApplyVM = {
  paths: [shop, quote('company', 'A company'), quote('hospitality', 'A hotel or villa')],
  selected: null,
  reply: { code: 'applicationReplyDays', params: { days: 2 } },
  result: null,
}
const signIn: PartnershipSignInVM = {
  email: null,
  action: '/api/x/auth/sign-in',
  reset: { href: '/api/x/auth/reset' },
  error: null,
}
const WHATSAPP = 'https://wa.me/6281200000001'

const page = (access: PartnershipAccessVM): PartnershipVM => ({
  surface: 'partnership',
  title: 'Buying for a shop, a hotel or a company',
  intro: [],
  highlights: ['100+ shops supplied', 'Printed in our own workshop', 'Shipping across Indonesia'],
  programmes: [
    {
      audience: 'shop',
      title: 'Stock our prints in your shop',
      body: [],
      terms: [
        { label: 'Pricing', value: 'Wholesale tiers, visible once you sign in' },
        { label: 'Minimum', value: '20 pieces per design, mixed sizes allowed' },
        { label: 'Reorder', value: 'One click from your order history' },
      ],
      cta: { label: 'Apply as a reseller', href: '/partnership#apply' },
    },
    {
      audience: 'company',
      title: 'A gift that carries a story',
      body: [],
      terms: [{ label: 'Quantity', value: 'From 25 pieces' }],
      cta: { label: 'Request a gifting quote', href: '/partnership#apply' },
    },
    {
      audience: 'hospitality',
      title: 'The islands on your walls',
      body: [],
      terms: [{ label: 'Sample', value: 'One piece sent before you commit' }],
      cta: { label: 'Request hotel samples', href: '/partnership#apply' },
    },
  ],
  access: streamed(access),
  whatsapp: { href: WHATSAPP, display: '+62 812 0000 0001' },
  seo: seo('Partnership', '/partnership'),
})

export const partnership = page({ kind: 'visitor', apply, signIn })

/** Just applied, or back through the acknowledgement's status link: waiting on staff. */
export const partnershipApplied = page({
  kind: 'applicant',
  standing: {
    status: 'applied',
    appliedAt: '2026-09-28T10:00:00+08:00',
    reply: { code: 'applicationReplyDays', params: { days: 2 } },
  },
  apply: null,
})

/** Declined, with the reason and a person to talk to — and the application again. */
export const partnershipDeclined = page({
  kind: 'applicant',
  standing: {
    status: 'declined',
    decidedAt: '2026-09-30T09:00:00+08:00',
    note: 'We only partner with shops in Bali and Java for now.',
    contact: { label: 'Talk to us on WhatsApp', href: WHATSAPP },
  },
  apply: { ...apply, selected: 'shop' },
})

/** Approved, back through the status link before setting a password: no terms until sign-in. */
export const partnershipApproved = page({
  kind: 'approved',
  approvedAt: '2026-10-01T11:00:00+08:00',
  next: 'set-password',
  signIn: { ...signIn, email: 'made@shop.example.test' },
})

export const partnershipRetailer = page({
  kind: 'retailer',
  firstName: 'Made',
  area: { label: 'Your partner area', href: '/account' },
})
