'use client'

/**
 * Nearby on the stores page (the order of 2026-11-25): every other store, by name, its first ones
 * and "See all", and a button that asks the browser where the visitor is and puts the stores
 * nearest first, each with its distance. The browser asks only when the button is pressed; the
 * position stays on the device (`./distance` runs here) and is never sent anywhere. Without it —
 * refused, unavailable, or no answer in time — the stores stay by name and a line says so. Every
 * word arrives as a prop.
 */
import { useState } from 'react'

import { Button } from '@engine/ui/button'

import type { Position } from '../../../server/shop/stores/group'
import { nearestFirst } from './distance'
import { StoreCard, type StoreCardData, type StoreCardWords } from './store-card'
import styles from './stores.module.css'

export type NearbyStore = StoreCardData & { readonly position: Position | null }

export type NearbyWords = StoreCardWords & {
  readonly ask: string
  readonly note: string
  readonly finding: string
  readonly sorted: string
  readonly failed: string
  /** "See all nearby stores (90)", resolved. */
  readonly seeAll: string
  /** "{distance} km away": `{distance}` is filled here. */
  readonly distance: string
}

type Status = 'idle' | 'finding' | 'sorted' | 'failed'

type Props = {
  readonly stores: readonly NearbyStore[]
  /** How many show before "See all". */
  readonly preview: number
  readonly words: NearbyWords
  readonly locale: 'en' | 'id'
}

export function NearbyStores({ stores, preview, words, locale }: Props): React.ReactElement {
  const [status, setStatus] = useState<Status>('idle')
  const [origin, setOrigin] = useState<Position | null>(null)
  const listed = origin
    ? nearestFirst(stores, origin)
    : stores.map((store) => ({ ...store, km: null as number | null }))
  const number = new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-GB', {
    maximumFractionDigits: 1,
  })
  const distanceOf = (km: number | null) =>
    km === null ? null : words.distance.replace('{distance}', number.format(km))

  const ask = () => {
    if (!('geolocation' in navigator)) {
      setStatus('failed')
      return
    }
    setStatus('finding')
    navigator.geolocation.getCurrentPosition(
      (found) => {
        setOrigin({ lat: found.coords.latitude, lng: found.coords.longitude })
        setStatus('sorted')
      },
      () => setStatus('failed'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    )
  }

  const line = {
    idle: words.note,
    finding: words.finding,
    sorted: words.sorted,
    failed: words.failed,
  }
  const cards = (list: typeof listed) => (
    <ul className={styles.grid}>
      {list.map((store) => (
        <StoreCard key={store.key} store={store} words={words} distance={distanceOf(store.km)} />
      ))}
    </ul>
  )
  const shown = listed.slice(0, preview)
  const rest = listed.slice(preview)
  return (
    <>
      <div className={styles.nearbyBar}>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={ask}
          disabled={status === 'finding'}
        >
          {words.ask}
        </Button>
        <p className={styles.nearbyStatus} role="status">
          {line[status]}
        </p>
      </div>
      {cards(shown)}
      {rest.length > 0 ? (
        <details className={styles.more}>
          <summary className={styles.seeAll}>{words.seeAll}</summary>
          {cards(rest)}
        </details>
      ) : null}
    </>
  )
}
