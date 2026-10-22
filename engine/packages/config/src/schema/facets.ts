/**
 * Facet keys and sort orders · entry: `@engine/config/schema`
 *
 * The listing vocabulary (CONTENT-MODEL.md §3), named once for the route map (C10), the listing
 * view models (C2) and the search port. The lists themselves are the zod-free
 * `@engine/config/constants` (`../constants/facets`), re-exported here with their zod enums.
 * Facet keys are also the query-string names verbatim (`?technique=etching`). Which facets a
 * brand shows follows from its modules and data; adding a key is a contract change.
 */
import { z } from 'zod'

import { FACET_KEYS, SORT_KEYS, type FacetKey, type SortKey } from '../constants/facets'

export { FACET_KEYS, SORT_KEYS, type FacetKey, type SortKey }
export const facetKeySchema = z.enum(FACET_KEYS)
export const sortKeySchema = z.enum(SORT_KEYS)
