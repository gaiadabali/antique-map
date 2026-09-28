/**
 * @contract C2 — fixtures `partnership` (visitor, applied, declined, retailer) · owner: ARC
 *
 * A fictional shop's trade page (D31): resellers apply for an account, companies and hotels
 * ask for a quote, and the last section is the application and partner sign-in. Then the
 * same page for someone who has just applied, for a declined applicant, and for an approved
 * retailer who is signed in. No state shows a trade price: the published terms are words.
 */
import type { FormFieldVM } from '../surfaces/form'
import type { PartnershipPathVM, PartnershipVM } from '../surfaces/partnership'
import { seo } from './_shared'

const field = (name: string, input: FormFieldVM['input'], required = true): FormFieldVM => ({
  name,
  input,
  required,
  autocomplete: null,
  options: [],
  maxLength: null,
})
const contact = [
  field('contact.fullName', 'text'),
  field('contact.email', 'email'),
  field('contact.whatsapp', 'tel', false),
]
const shop: PartnershipPathVM = {
  audience: 'shop',
  label: 'A shop',
  outcome: 'account',
  fields: [
    field('business.name', 'text'),
    { ...field('business.npwp', 'text'), maxLength: 20 },
    field('business.address', 'textarea'),
    {
      ...field('business.shopType', 'select'),
      options: [
        { value: 'gallery', label: 'A gallery' },
        { value: 'gift-shop', label: 'A gift shop' },
        { value: 'bookshop', label: 'A bookshop' },
        { value: 'hotel-boutique', label: 'A hotel boutique' },
      ],
    },
    ...contact,
    field('consent.application', 'checkbox'),
  ],
  action: '/api/x/commerce/retailers/applications',
}
const quote = (audience: 'company' | 'hospitality', label: string): PartnershipPathVM => ({
  audience,
  label,
  outcome: 'quote',
  fields: [field('institution.organisation', 'text'), field('message', 'textarea'), ...contact],
  action: '/api/x/commerce/quotes',
})

export const partnership: PartnershipVM = {
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
  access: {
    kind: 'visitor',
    apply: {
      paths: [shop, quote('company', 'A company'), quote('hospitality', 'A hotel or villa')],
      selected: null,
      consents: ['marketingEmail'],
      reply: { code: 'applicationReplyDays', params: { days: 2 } },
      result: null,
    },
    signIn: {
      email: null,
      action: '/api/x/auth/sign-in',
      reset: { href: '/api/x/auth/reset' },
      error: null,
    },
  },
  whatsapp: { href: 'https://wa.me/6281200000001', display: '+62 812 0000 0001' },
  seo: seo('Partnership', '/partnership'),
}

/** Just applied, or back through the acknowledgement's status link: waiting on staff. */
export const partnershipApplied: PartnershipVM = {
  ...partnership,
  access: {
    kind: 'applicant',
    standing: {
      status: 'applied',
      appliedAt: '2026-09-28T10:00:00+08:00',
      reply: { code: 'applicationReplyDays', params: { days: 2 } },
    },
  },
}

export const partnershipDeclined: PartnershipVM = {
  ...partnership,
  access: {
    kind: 'applicant',
    standing: {
      status: 'declined',
      decidedAt: '2026-09-30T09:00:00+08:00',
      note: 'We only partner with shops in Bali and Java for now.',
      contact: { label: 'Talk to us on WhatsApp', href: 'https://wa.me/6281200000001' },
    },
  },
}

export const partnershipRetailer: PartnershipVM = {
  ...partnership,
  access: {
    kind: 'retailer',
    firstName: 'Made',
    area: { label: 'Your partner area', href: '/account' },
  },
}
