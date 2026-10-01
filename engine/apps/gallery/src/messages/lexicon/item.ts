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
  'status.soldPriceRealised': 'Sold · price realised {price}',
  'status.inMyBag': 'In your cart',
  'status.inMyCheckout': 'In your checkout until {date}',
  'status.heldForMe.hold': 'Held for you until {date}',
  'status.heldForMe.offer': 'Held for you until {date}: your offer was accepted',
  'status.heldForMe.invoice': 'Held for you until {date}, the proforma’s due date',
  'status.myOffer.submitted': 'Your offer of {amount} is with us',
  'status.myOffer.countered': 'Our counter: {amount}, until {date}',
  'status.oneOfOne': 'One of one',
  'status.edition': 'Edition {number} of {total}',
  'status.domesticOnly': 'Available for delivery within {country} · View it in {place}',
  'status.exportPending': 'Export papers pending · View it in {place}',
  'status.enquiryOnly.unroutable': 'Available on enquiry',
  'status.enquiryOnly.notForSale': 'Not for sale online',
  'status.enquiryOnly.unverified': 'Availability could not be confirmed. Ask us.',
  // price (C2 UniquePriceVM, PriceSet.basis)
  'price.onRequest': 'Price on request',
  'price.from': 'From {price}',
  'price.converted': '≈ {estimate} — charged in {price}',
  // beside a converted estimate (D47): the charge is exact; a conversion after it is not ours
  'price.convertedNote':
    'Your card issuer or PayPal may convert the charge again, at its own rate.',
  'price.queued': 'A specialist will reply within {hours} hours',
  'price.offerOnly': 'Offers invited',
  // purchase actions (C1 PURCHASE_ACTIONS, the variants panel's actions)
  'action.buy': 'Buy now',
  'action.addToCart': 'Add to cart',
  'action.reserve': 'Reserve',
  'action.offer': 'Make an offer',
  'action.requestPrice': 'Request price',
  'action.enquire': 'Enquire',
  'action.whatsapp': 'Ask on WhatsApp',
  'action.viewing': 'Book a viewing',
  'action.proforma': 'Proforma for institutions',
  'action.pay': 'Complete payment',
  'action.alert': 'Alert me',
  'action.save': 'Save {title}',
  'action.unsave': 'Remove {title} from saved',
  'action.share': 'Share',
  'action.factsheet': 'Download factsheet (PDF)',
  'action.framingQuote': 'Ask for a framing quote',
  'action.openInBrowser': 'Open in your browser',
  // labels that are never optional (DESIGN-SYSTEM.md §10, Requirement 7.1)
  'label.reproduction': 'Reproduction',
  'label.archiveNo': 'Archive No. {archiveNo}',
  'label.stockNumber': 'Stock no. {stockNumber}',
  // imagery (docs/design/imagery/retouching-and-labelling.md §4–§6, room-scenes.md §8): a
  // synthetic image's label by C9 SYNTHETIC_LABEL (`image.synthetic.${label}`), on the image and
  // in the filmstrip, and at the start of its alt text
  'image.synthetic.digital-mockup': 'Digital mockup',
  'image.synthetic.ai-generated': 'AI-generated image',
  'image.syntheticAlt.digital-mockup': 'Digital mockup: {alt}',
  'image.syntheticAlt.ai-generated': 'AI-generated image: {alt}',
  'image.inMat': 'Photographed in its mat — margins not shown',
  // the filmstrip's roles (C9 WORK_IMAGE_ROLES and LOCATION_IMAGE_ROLES, media/src/contract/roles.ts)
  'image.role.recto': 'Recto',
  'image.role.verso': 'Verso',
  'image.role.detail': 'Detail',
  'image.role.raking': 'Raking light',
  'image.role.transmitted': 'Transmitted light',
  'image.role.framed': 'Framed',
  'image.role.in-room': 'In a room',
  'image.role.scale': 'To scale',
  'image.role.showroom': 'In the showroom',
  // sister links (BRANDS.md §5; C2 SisterLinkVM)
  'sister.prints': 'Own a print of this map',
  'sister.printsFrom': 'Prints of this map from {sister}',
  'sister.separate': '{sister} is a separate shop with its own account',
  'sold.alternative': 'This example has sold. Another example is available.',
  'sold.similar': 'Similar works',
})
