'use client'

/**
 * Nearby on the stores page (the order of 2026-11-25): every other store, by name, its first ones
 * and "See all". Above them, "Stores nearest to you" as plain words, not a call to action,
 * and under it the line that explains or reports (the UI/UX revisions of 2026-11-25). Once the
 * section comes into view the browser is asked, a single time, where the visitor is, and the
 * stores are put nearest first, each with its distance. The position stays on the device
 * (`./distance` runs here) and is never sent anywhere. Without it — refused, unavailable, or no
 * answer in time — the stores stay by name and the line says so. Every word arrives as a prop.
 */
import { useEffect, useRef, useState } from 'react'

import type { Position } from '../../../server/shop/stores/group'
import { nearestFirst } from './distance'
import { StoreCard, type StoreCardData, type StoreCardWords } from './store-card'
import styles from './stores.module.css'

export type NearbyStore = StoreCardData & { readonly position: Position | null }

export type NearbyWords = StoreCardWords & {
  /** "Stores nearest to you": a description, not a call to action. */
  readonly lead: string
  readonly note: string
  readonly finding: string
  readonly sorted: string
  readonly failed: string
  /** "See all nearby stores (90)", resolved. */
  readonly seeAll: string
  /** "{distance} km away": `{distance}` is filled here, in whole kilometres. */
  readonly distance: string
  /** "Under 1 km away": nearer than a whole kilometre. */
  readonly near: string
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
  const barRef = useRef<HTMLDivElement>(null)
  const listed = origin
    ? nearestFirst(stores, origin)
    : stores.map((store) => ({ ...store, km: null as number | null }))
  // Whole kilometres: the stores' positions are rounded to about one (`server/shop/stores/group`).
  const number = new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-GB', {
    maximumFractionDigits: 0,
  })
  const distanceOf = (km: number | null) =>
    km === null
      ? null
      : km < 1
        ? words.near
        : words.distance.replace('{distance}', number.format(Math.round(km)))

  // Ask once, when Nearby comes into view (at once without an observer to tell).
  useEffect(() => {
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
    const bar = barRef.current
    if (bar === null || !('IntersectionObserver' in window)) {
      ask()
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      ask()
    })
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])

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
      <div className={styles.nearbyBar} ref={barRef}>
        <p className={styles.nearbyLead}>{words.lead}</p>
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
