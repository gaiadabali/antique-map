/**
 * Browse and search: facet and sort names, object types, and the maker line's roles and certainty
 * (TASKS.md 6.3.f). Each list is a contract's, spelt as its codes, so a component looks a label
 * up by the value it holds: `facet.${key}`, `sort.${key}`, `objectType.${type}`,
 * `maker.role.${role}`, `maker.certainty.${certainty}`.
 * Keys and neutral defaults only — the words are the brand’s (`../keys.ts`).
 */
import { defineMessages } from '@engine/i18n'

export const LISTING_KEYS = defineMessages({
  // facet names (C1 FACET_KEYS, config/src/schema/facets.ts): which a listing shows follows from
  // its modules and data, so the app names every one; an option's own label is data
  'facet.objectType': 'Type',
  'facet.place': 'Place',
  'facet.maker': 'Maker',
  'facet.date': 'Date',
  'facet.technique': 'Technique',
  'facet.colour': 'Colouring',
  'facet.grade': 'Condition',
  'facet.size': 'Size',
  'facet.price': 'Price',
  'facet.availability': 'Availability',
  'facet.subject': 'Subject',
  'facet.productType': 'Product type',
  'facet.format': 'Format',
  'facet.orientation': 'Orientation',
  'facet.dominantColour': 'Colour',
  'facet.room': 'Room',
  'facet.mood': 'Mood',
  'facet.occasion': 'Occasion',
  'facet.recipient': 'Recipient',
  'facet.inShowroom': 'In the showroom now',
  'facet.shipsToday': 'Ships today',
  'facet.madeToOrder': 'Made to order',
  // the price range's toggle (C2 FacetVM range `includeOnRequest`)
  'facet.price.includeOnRequest': 'Include price on request',
  // sort orders (C1 SORT_KEYS)
  'sort.relevance': 'Best match',
  'sort.featured': 'Featured',
  'sort.newest': 'Newest',
  'sort.bestSelling': 'Best-selling',
  'sort.priceAsc': 'Price: low to high',
  'sort.priceDesc': 'Price: high to low',
  'sort.dateAsc': 'Date: oldest first',
  'sort.dateDesc': 'Date: newest first',
  'sort.maker': 'Maker, A–Z',
  // object types (C1 OBJECT_TYPES, config/src/schema/catalogue.ts)
  'objectType.map': 'Map',
  'objectType.sea-chart': 'Sea chart',
  'objectType.city-plan': 'City plan',
  'objectType.view': 'View',
  'objectType.print': 'Print',
  'objectType.photograph': 'Photograph',
  'objectType.book': 'Book',
  'objectType.atlas': 'Atlas',
  'objectType.poster': 'Poster',
  'objectType.document': 'Document',
  'objectType.ethnographic': 'Ethnographic object',
  'objectType.other': 'Other',
  // maker roles (C2 MakerRole, view-models/src/common.ts; C12 SnapshotMaker.role)
  'maker.role.cartographer': 'Cartographer',
  'maker.role.engraver': 'Engraver',
  'maker.role.publisher': 'Publisher',
  'maker.role.author': 'Author',
  'maker.role.artist': 'Artist',
  'maker.role.photographer': 'Photographer',
  'maker.role.studio': 'Studio',
  'maker.role.printer': 'Printer',
  // the certainty a credit carries, never upgraded (C2 Certainty; DESIGN-SYSTEM.md §10)
  'maker.certainty.certain': '{name}',
  'maker.certainty.attributed': 'Attributed to {name}',
  'maker.certainty.after': 'After {name}',
  'maker.certainty.workshop': 'Workshop of {name}',
})
