/**
 * @contract C2 — fixtures `partnership` (visitor, received, apply failed, sign-in failed, applied, declined, partner) · owner: ARC
 *
 * A fictional shop's one programme for every business buyer (D36): what a partner gets, for
 * shops, hotels and villas, cafés and companies, then the application and partner sign-in —
 * cached, so they work without JavaScript. Then the same page as each visitor meets it: just
 * applied (the same answer for everyone), an application or a sign-in sent back without
 * JavaScript, an application waiting on staff, a declined one (with the form to apply again),
 * and a signed-in partner. No state shows a trade price: the published terms are words.
 */
import type { RetailerShopType } from '@engine/domain/api'

import type {
  PartnershipAccessVM,
  PartnershipApplyVM,
  PartnershipVM,
} from '../surfaces/partnership'
import { contactFields, entry, hidden, optional, signInForm, tick } from './_forms'
import { seo, streamed } from './_shared'

/** Every kind of business C6 takes (`RETAILER_SHOP_TYPES`, D36), named by the component. */
const SHOP_TYPES = [
  'souvenir-shop',
  'gift-shop',
  'gallery',
  'bookshop',
  'hotel-boutique',
  'museum-shop',
  'concept-store',
  'hotel',
  'villa',
  'cafe-restaurant',
  'corporate',
  'other',
] as const satisfies readonly RetailerShopType[]
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Assert<T extends true> = T
// None left out: a kind C6 adds fails here until the fixture offers it too.
type _EveryShopType = Assert<Equals<(typeof SHOP_TYPES)[number], RetailerShopType>>
const business = { group: 'business' }

const apply: PartnershipApplyVM = {
  fields: [
    entry('business.name', 'text', { ...business, autocomplete: 'organization' }),
    entry('business.shopType', 'select', {
      ...business,
      options: { values: SHOP_TYPES, names: 'message' },
    }),
    entry('business.country', 'select', {
      ...business,
      autocomplete: 'country',
      options: { values: ['ID', 'SG', 'AU', 'NL'], names: 'region' },
      value: 'ID',
    }),
    entry('business.address', 'textarea', { ...business, autocomplete: 'street-address' }),
    optional('business.npwp', 'text', {
      ...business,
      requiredWhen: { field: 'business.country', oneOf: ['ID'] },
      inputMode: 'numeric',
      maxLength: 20,
    }),
    optional('business.taxNumber', 'text', business),
    optional('business.website', 'text', { ...business, autocomplete: 'url', inputMode: 'url' }),
    optional('business.message', 'textarea', business),
    ...contactFields(),
    tick('consent.application', 'consent', true),
    tick('consent.marketingEmail', 'consent'),
    tick('consent.marketingWhatsapp', 'consent'),
    hidden('returnTo', '/partnership'),
  ],
  action: '/api/x/commerce/retailers/applications',
  reply: { code: 'applicationReplyDays', params: { days: 2 } },
}
const WHATSAPP = 'https://wa.me/6281200000001'
const trade = (title: string, value: string) => ({
  title,
  body: [],
  terms: [
    { label: 'Pricing', value: 'Trade tiers, visible once you sign in' },
    { label: 'Ordering', value },
  ],
})

const page = (access: PartnershipAccessVM | null): PartnershipVM => ({
  surface: 'partnership',
  title: 'Partner with us',
  intro: [],
  highlights: ['100+ shops supplied', 'Printed in our own workshop', 'Shipping across Indonesia'],
  benefits: [
    trade('For shops', '20 pieces per design, mixed sizes allowed'),
    trade('For hotels and villas', 'Room art and a lobby corner, samples first'),
    trade('For cafés', 'Walls that tell the island story'),
    trade('For companies', 'Gifts in quantity, from 25 pieces'),
  ],
  visitor: { apply, signIn: signInForm('/partnership') },
  access: streamed(access),
  whatsapp: { href: WHATSAPP, display: '+62 812 0000 0001' },
  seo: seo('Partnership', '/partnership'),
})

export const partnership = page(null)

/** Sent: the same answer whoever applied — nothing about an account. */
export const partnershipReceived = page({
  kind: 'received',
  reply: { code: 'applicationReplyDays', params: { days: 2 } },
})

/** Sent back without JavaScript: every failing field at once, every entry kept. */
export const partnershipApplyFailed = page({
  kind: 'applyFailed',
  result: {
    kind: 'invalid',
    fields: [
      { path: 'business.npwp', reason: 'required' },
      { path: 'consent.application', reason: 'required' },
    ],
    values: { 'business.name': 'Toko Contoh', 'business.country': 'ID' },
  },
})

/** One answer for an unknown email, a wrong password and a partner who is not approved (D34). */
export const partnershipSignInFailed = page({
  kind: 'signInFailed',
  email: 'made@shop.example.test',
  error: { kind: 'invalid' },
})

/** Back through the acknowledgement's status link: waiting on staff. */
export const partnershipApplied = page({
  kind: 'applied',
  standing: {
    status: 'applied',
    appliedAt: '2026-09-28T10:00:00+08:00',
    reply: { code: 'applicationReplyDays', params: { days: 2 } },
  },
})

/** Declined, with the reason and a person to talk to; the cached form applies again. */
export const partnershipDeclined = page({
  kind: 'declined',
  standing: {
    status: 'declined',
    decidedAt: '2026-09-30T09:00:00+08:00',
    note: 'We only partner with businesses in Bali and Java for now.',
    contact: { label: 'Talk to us on WhatsApp', href: WHATSAPP },
  },
})

export const partnershipRetailer = page({
  kind: 'retailer',
  firstName: 'Made',
  area: { label: 'Your partner area', href: '/account' },
})
