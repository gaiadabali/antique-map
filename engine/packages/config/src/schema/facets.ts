/**
 * @contract C1 — brand config: facet keys and sort orders · owner: ARC · entry: `@engine/config/schema`
 *
 * The listing vocabulary (CONTENT-MODEL.md §3), named once for the route map (C10), the listing
 * view models (C2) and the search port. A leaf. Facet keys are also the query-string names
 * verbatim (`?technique=etching`). Which facets a brand shows follows from its modules and
 * data; adding a key is a contract change.
 */
import { z } from 'zod'

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
export const facetKeySchema = z.enum(FACET_KEYS)
export type FacetKey = z.infer<typeof facetKeySchema>

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
export const sortKeySchema = z.enum(SORT_KEYS)
export type SortKey = z.infer<typeof sortKeySchema>
