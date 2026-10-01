/**
 * The account and after the order: section names, what waits on the buyer, enquiry topics,
 * returns and consignments (TASKS.md 6.3.f); the profile's buyer type, the analytics consent, a
 * viewing's purpose and a consignment photo's role (6.3.i). Each list is a contract's, spelt as
 * its codes.
 * Keys and neutral defaults only — the words are the brand’s (`../keys.ts`).
 */
import { defineMessages } from '@engine/i18n'

export const ACCOUNT_KEYS = defineMessages({
  // a buyer's sections (C10 ACCOUNT_SECTIONS; C2 AccountNavVM, the `account` fixture's nav)
  'account.section.overview': 'Overview',
  'account.section.orders': 'Orders',
  'account.section.wishlist': 'Wishlist',
  'account.section.wantLists': 'Alerts',
  'account.section.offers': 'Offers',
  'account.section.holds': 'Holds',
  'account.section.priceRequests': 'Price requests',
  'account.section.viewings': 'Viewings',
  'account.section.consignments': 'Sell to us',
  'account.section.addresses': 'Addresses',
  'account.section.profile': 'Profile',
  'account.section.privacy': 'Privacy',
  // what waits on the buyer, the overview's first band (C2 AttentionVM.kind); the item and the
  // date are shown beside it, so the line names neither
  'account.attention.offerCountered': 'We have countered your offer',
  'account.attention.holdExpiring': 'A hold for you is ending',
  'account.attention.paymentPending': 'A payment is waiting',
  'account.attention.viewingSoon': 'Your viewing is coming up',
  'account.attention.priceAnswered': 'Your price request has been answered',
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
  // a consignment's timeline (C6 ConsignmentStatus; C2 AccountConsignmentVM)
  'consignment.status.received': 'Received',
  'consignment.status.reviewing': 'Being reviewed',
  'consignment.status.offer-made': 'Offer made',
  'consignment.status.accepted': 'Agreed',
  'consignment.status.declined': 'Declined',
  // the profile's buyer type (C2 ProfileVM.type, view-models/src/surfaces/account.ts:54; 6.3.i)
  'profile.type.collector': 'Collector',
  'profile.type.institution': 'Institution',
  'profile.type.trade': 'Trade',
  'profile.type.retail': 'Private buyer',
  // the privacy section's third purpose (C2 ConsentVM.purpose, account.ts:61); the other two are
  // `consent.marketingEmail` and `consent.marketingWhatsapp` (./conversations)
  'consent.analytics': 'Measure how I use the site (optional)',
  // what a viewing is for (C6 AppointmentPurpose, domain/src/contracts/services.ts:73)
  'viewing.purpose.viewing': 'Viewing',
  'viewing.purpose.consultation': 'Consultation',
  // what each "Sell to us" photo shows (C6 ConsignmentPhoto.role, services.ts:39; C2 FormVM
  // `uploads.roles`)
  'consignment.photo.item': 'The whole work',
  'consignment.photo.title': 'The title',
  'consignment.photo.verso': 'The back',
  'consignment.photo.detail': 'A detail',
})
