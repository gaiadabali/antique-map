/**
 * One store's card on the stores page (13.2): one of the stores' photographs, the address and
 * hours muted, how far it is once the visitor has asked for the nearest (Nearby), and the map
 * link. No name and no area line (the UI/UX revision of 2026-11-25): the section's title says
 * where the store is. Every word arrives resolved, so the page (a Server Component) and Nearby
 * (a client island, `./nearby`) draw the same card.
 */
import { CapsLink } from '../ui/caps-link'
import styles from './stores.module.css'

/** A card's own data, ready to draw. */
export type StoreCardData = {
  readonly key: string
  readonly hours: string | null
  readonly mapUrl: string
  readonly photo: { readonly src: string; readonly width: number; readonly height: number }
}

/** The words every card shares. */
export type StoreCardWords = {
  readonly address: string
  readonly hours: string
  readonly map: string
  /** "Open in Maps (opens in a new tab)": the link's accessible name. */
  readonly mapLabel: string
}

export function StoreCard({
  store,
  words,
  distance = null,
}: {
  readonly store: StoreCardData
  readonly words: StoreCardWords
  /** "2.4 km away", once Nearby is sorted. */
  readonly distance?: string | null
}) {
  return (
    <li className={styles.store}>
      {/* One of the stores' photographs, not necessarily this store's own (`./store-photos`):
          decoration, so it has no words of its own. */}
      <img
        className={styles.photo}
        src={store.photo.src}
        width={store.photo.width}
        height={store.photo.height}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div className={styles.storeBody}>
        <p className={styles.line}>{words.address}</p>
        {store.hours !== null && (
          <p className={styles.line}>
            <span className={styles.hoursLabel}>{words.hours}</span> {store.hours}
          </p>
        )}
        {distance !== null && <p className={styles.line}>{distance}</p>}
        <CapsLink
          href={store.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={words.mapLabel}
        >
          {words.map}
        </CapsLink>
      </div>
    </li>
  )
}
