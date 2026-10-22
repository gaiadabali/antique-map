/**
 * @contract C1 — brand config: the listing vocabulary, zod-free · owner: ARC · entry: `@engine/config/constants`
 *
 * The facet keys and sort orders (CONTENT-MODEL.md §3) as plain data, so the route map (and so
 * `@engine/config/sites`, which a Client Component reaches) never pulls in the schema library.
 * `../schema/facets` builds the zod enums on these lists and re-exports them.
 */
export const FACET_KEYS = [
  'objectType',
  'place',
  'maker',
  'date',
  'technique',
  'colour',
  'grade',
  'size',
  'price',
  'availability',
  'subject',
  'productType',
  'format',
  'orientation',
  'dominantColour',
  'room',
  'mood',
  'occasion',
  'recipient',
  'inShowroom',
  'shipsToday',
  'madeToOrder',
] as const
export type FacetKey = (typeof FACET_KEYS)[number]

/**
 * The listing sort orders (EXPERIENCE-GALLERY.md §4: newest · price ↑ ↓ · date of the work ·
 * maker; EXPERIENCE-SHOP.md §2: featured · best-selling · new · price · date of the original;
 * search: relevance). A listing offers the ones its data supports; its default is the route
 * map's `defaultSort` (C10) and never appears in a URL, so one order has one address.
 */
export const SORT_KEYS = [
  'relevance',
  'featured',
  'newest',
  'bestSelling',
  'priceAsc',
  'priceDesc',
  'dateAsc',
  'dateDesc',
  'maker',
] as const
export type SortKey = (typeof SORT_KEYS)[number]
