'use client'

/**
 * The listing's beacons (5.1.b; ANALYTICS.md): `page.viewed` as a listing page, and
 * `listing.viewed` with the filters the URL carries (`beaconFacetsOf()`) and the result count —
 * once per state, on mount, fire-and-forget through the shared beacon.
 */
import { useEffect } from 'react'

import { track } from '../../../shared/beacon/beacon'

export function BrowseBeacon({
  listing,
  facets,
  resultCount,
}: {
  readonly listing: 'type' | 'maker' | 'place' | 'subject' | 'all'
  readonly facets: readonly { readonly key: string; readonly value: string }[]
  readonly resultCount: number
}): null {
  useEffect(() => {
    track('page.viewed', { pageType: 'listing' })
    track('listing.viewed', { listing, facets, resultCount })
  }, [listing, facets, resultCount])
  return null
}
