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
  'price.converted': '≈ {estimate} — charged in {price}',
  // beside a converted estimate (D47): the charge is exact; a conversion after it is not ours
  'price.convertedNote':
    'Your card issuer or PayPal may convert the charge again, at its own rate.',
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
  // the steps that fill `{restoration}`, joined as a list (C9 PRINT_RESTORATIONS, masters.ts)
  'restoration.foxing-and-stains': 'foxing and stains removed',
  'restoration.folds-and-creases': 'folds and creases smoothed',
  'restoration.tears-closed': 'tears closed',
  'restoration.losses-filled': 'small losses filled',
  'restoration.tone-rebalanced': 'colour and tone rebalanced',
  'restoration.paper-neutralised': 'paper tone neutralised',
  'restoration.digitally-coloured': 'colour added or changed digitally',
  'restoration.sheets-joined': 'sheets joined into one design',
  'label.madeToOrder': 'Made to order',
  // imagery (docs/design/imagery/retouching-and-labelling.md §4–§6, room-scenes.md §8): a
  // synthetic image's label by C9 SYNTHETIC_LABEL (`image.synthetic.${label}`), on the image and
  // in the filmstrip, and at the start of its alt text; the room plate's caption, with the
  // plate's `wallWidthCm` as `{width}`, is `configurator.previewCaption` (./shop)
  'image.synthetic.digital-mockup': 'Digital mockup',
  'image.synthetic.ai-generated': 'AI-generated image',
  'image.syntheticAlt.digital-mockup': 'Digital mockup: {alt}',
  'image.syntheticAlt.ai-generated': 'AI-generated image: {alt}',
  // a product's and the showroom's roles (C9 PRODUCT_IMAGE_ROLES, LOCATION_IMAGE_ROLES)
  'image.role.in-room': 'In a room',
  'image.role.flat': 'Flat',
  'image.role.detail': 'Detail',
  'image.role.lifestyle': 'In use',
  'image.role.scale': 'To scale',
  'image.role.packaging': 'Packaging',
  'image.role.showroom': 'In the showroom',
  // where in a location a photograph was taken, in the visit page's order (C9
  // LOCATION_IMAGE_AREAS, media/src/contract/roles.ts:78; TASKS.md 6.3.i)
  'image.area.street': 'Street',
  'image.area.entrance': 'Entrance',
  'image.area.wide': 'Inside',
  'image.area.wall': 'Wall',
  'image.area.counter': 'Counter',
  'image.area.vignette': 'Close-up',
  'image.area.making': 'Making',
  'sister.separate': '{sister} is a separate shop with its own account',
  'sister.original': 'The original is at {sister}',
  'sister.originalOnHold': 'The original is on hold at {sister}',
  'sister.originalEnquire': 'Enquire about the original',
  'sister.originalSold': 'Made from a scan of the original, now in a private collection',
  'sold.similar': 'Similar works',
})
