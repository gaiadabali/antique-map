/**
 * The item page: availability, price, purchase actions, the labels that are never optional,
 * imagery and sister links.
 * Keys and neutral defaults only — the words are the brand’s (`../keys.ts`).
 */
import { defineMessages } from '@engine/i18n'

export const ITEM_KEYS = defineMessages({
  // status: what a unique work's availability says (C2 UniqueStateVM, CardStatusVM)
  'status.checking': 'Checking availability…',
  'status.available': 'Available',
  'status.onHold': 'On hold',
  'status.onHoldUntil': 'On hold until {date}',
  'status.onHoldCheckBack': 'On hold — check back in {minutes} minutes',
  'status.sold': 'Sold',
  'status.inMyBag': 'In your cart',
  'status.inMyCheckout': 'In your checkout until {date}',
  'status.oneOfOne': 'One of one',
  'status.edition': 'Edition {number} of {total}',
  'status.domesticOnly': 'Available for delivery within {country} · View it in {place}',
  'status.enquiryOnly.unroutable': 'Available on enquiry',
  'status.enquiryOnly.notForSale': 'Not for sale online',
  'status.enquiryOnly.unverified': 'Availability could not be confirmed. Ask us.',
  // price (C2 UniquePriceVM, PriceSet.basis)
  'price.onRequest': 'Price on request',
  'price.from': 'From {price}',
  'price.converted': '≈ {estimate} — charged as {price}',
  'action.enquire': 'Enquire',
  'action.whatsapp': 'Ask on WhatsApp',
  'action.pay': 'Complete payment',
  'action.addToBag': 'Add to bag',
  'action.quote': 'Turn this into a quote',
  'action.alert': 'Alert me',
  'action.save': 'Save {title}',
  'action.unsave': 'Remove {title} from saved',
  'action.share': 'Share',
  'action.openInBrowser': 'Open in your browser',
  // labels that are never optional (DESIGN-SYSTEM.md §10, Requirement 7.1)
  'label.reproduction': 'Reproduction',
  'label.reproductionOf': 'Reproduction of an original in the {sister} archive',
  'label.archiveNo': 'Archive No. {archiveNo}',
  'label.restored': 'Digitally restored for print: {restoration}',
  'label.madeToOrder': 'Made to order',
  // imagery (docs/design/imagery/retouching-and-labelling.md §4–§6, room-scenes.md §8)
  'image.mockup': 'Digital mockup',
  'image.mockupAlt': 'Digital mockup: {alt}',
  'image.aiGenerated': 'AI-generated image',
  'image.aiGeneratedAlt': 'AI-generated image: {alt}',
  'sister.separate': '{sister} is a separate shop with its own account',
  'sister.original': 'The original is at {sister}',
  'sister.originalOnHold': 'The original is on hold at {sister}',
  'sister.originalEnquire': 'Enquire about the original',
  'sister.originalSold': 'Made from a scan of the original, now in a private collection',
  'sold.similar': 'Similar works',
})
