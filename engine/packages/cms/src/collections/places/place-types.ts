/**
 * What kind of place a gazetteer entry is (CONTENT-MODEL.md §3 `places.type`; C2 `PlaceVM.type`,
 * "island", "town", "region" — shown as a label). A controlled list, because a place page and the
 * place facet read it (an island group lists its islands, a town its quarters); the wording a
 * visitor reads is the lexicon's (6.3), keyed by these values.
 */
export const PLACE_TYPES = [
  'region',
  'country',
  'island-group',
  'island',
  'province',
  'kingdom',
  'city',
  'town',
  'sea',
  'strait',
  'ocean',
] as const
export type PlaceType = (typeof PLACE_TYPES)[number]

export const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  region: 'Region',
  country: 'Country',
  'island-group': 'Island group',
  island: 'Island',
  province: 'Province',
  kingdom: 'Kingdom or sultanate',
  city: 'City',
  town: 'Town',
  sea: 'Sea',
  strait: 'Strait',
  ocean: 'Ocean',
}
