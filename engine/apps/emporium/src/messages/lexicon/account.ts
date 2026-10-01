/**
 * The partner's account, the Partnership application's shop types, enquiry topics and returns
 * (TASKS.md 6.3.f); the profile's buyer type and the analytics consent (6.3.i). Each list is a
 * contract's, spelt as its codes.
 * Keys and neutral defaults only — the words are the brand’s (`../keys.ts`).
 */
import { defineMessages } from '@engine/i18n'

export const ACCOUNT_KEYS = defineMessages({
  // an approved partner's sections (C10 ACCOUNT_SECTIONS; the `account-retailer` fixture's nav)
  'account.section.overview': 'Overview',
  'account.section.orders': 'Orders',
  'account.section.quotes': 'Quotes',
  'account.section.terms': 'Trade terms',
  'account.section.addresses': 'Addresses',
  'account.section.profile': 'Profile',
  'account.section.privacy': 'Privacy',
  // what kind of business applies (C6 RETAILER_SHOP_TYPES, D36): the select's options, named
  // `<field>.<value>` (C2 EntryFieldVM.options)
  'business.shopType.souvenir-shop': 'Souvenir shop',
  'business.shopType.gift-shop': 'Gift shop',
  'business.shopType.gallery': 'Gallery',
  'business.shopType.bookshop': 'Bookshop',
  'business.shopType.hotel-boutique': 'Hotel boutique',
  'business.shopType.museum-shop': 'Museum shop',
  'business.shopType.concept-store': 'Concept store',
  'business.shopType.hotel': 'Hotel',
  'business.shopType.villa': 'Villa',
  'business.shopType.cafe-restaurant': 'Café or restaurant',
  'business.shopType.corporate': 'Company',
  'business.shopType.other': 'Other business',
  // enquiry topics (C6 EnquiryTopic; C2 FormVM.topic, `?topic=` in the links)
  'enquiry.topic': 'Topic',
  'enquiry.topic.general': 'General question',
  'enquiry.topic.price-request': 'The price',
  'enquiry.topic.condition': 'Condition',
  'enquiry.topic.shipping-quote': 'Shipping quote',
  'enquiry.topic.framing': 'Framing',
  'enquiry.topic.export': 'Export',
  // returns (C6 ReturnReason, ReturnRequestView.status — after-sale.ts): labels, never a promise
  'return.reason.damaged': 'It arrived damaged',
  'return.reason.not-as-described': 'It is not as described',
  'return.reason.wrong-item': 'I received the wrong item',
  'return.reason.changed-mind': 'I changed my mind',
  'return.reason.other': 'Something else',
  'return.status.requested': 'Requested',
  'return.status.approved': 'Approved',
  'return.status.declined': 'Declined',
  'return.status.received': 'Received by us',
  'return.status.refunded': 'Refunded',
  'return.status.closed': 'Closed',
  // the profile's buyer type (C2 ProfileVM.type, view-models/src/surfaces/account.ts:54; 6.3.i)
  'profile.type.collector': 'Collector',
  'profile.type.institution': 'Institution',
  'profile.type.trade': 'Trade',
  'profile.type.retail': 'Private buyer',
  // the privacy section's third purpose (C2 ConsentVM.purpose, account.ts:61); the other two are
  // `consent.marketingEmail` and `consent.marketingWhatsapp` (./conversations)
  'consent.analytics': 'Measure how I use the site (optional)',
})
