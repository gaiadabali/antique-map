'use client'

/**
 * The search page's beacons (5.1.b; ANALYTICS.md): `page.viewed` as a search page and
 * `search.submitted` with the result count and whether it was a miss. The words go only into the
 * event's `query` prop, which collect redacts (`server/analytics`); they are capped at the
 * schema's 100 characters here and never put into a URL this page builds for the beacon.
 */
import { useEffect } from 'react'

import { track } from '../../../shared/beacon/beacon'

export function SearchBeacon({
  query,
  resultCount,
}: {
  readonly query: string
  readonly resultCount: number
}): null {
  useEffect(() => {
    track('page.viewed', { pageType: 'search' })
    track('search.submitted', {
      query: query.slice(0, 100),
      resultCount,
      zeroResults: resultCount === 0,
    })
  }, [query, resultCount])
  return null
}
