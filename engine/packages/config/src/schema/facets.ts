/**
 * @contract C1 — brand config: facet keys · owner: ARC · entry: `@engine/config/schema`
 *
 * The browse facets (CONTENT-MODEL.md §3), named once for the route map's facet
 * vocabularies (C10), the listing view models (C2) and the search port. A leaf. Keys are
 * also the query-string names verbatim (`?technique=etching`). Which facets a brand shows
 * follows from its modules and data; adding a key is a contract change.
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
