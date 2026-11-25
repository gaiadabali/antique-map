/**
 * One store's card on the stores page (13.2): one of the stores' photographs, the name in the
 * serif, its area, the address and hours muted, how far it is once the visitor has asked for the
 * nearest (Nearby), and the map link. Every word arrives resolved, so the page (a Server
 * Component) and Nearby (a client island, `./nearby`) draw the same card.
 */
import { CapsLink } from '../ui/caps-link'
import styles from './stores.module.css'

/** A card's own data and words, ready to draw. */
export type StoreCardData = {
  readonly key: string
  readonly name: string
  readonly area: string | null
  readonly hours: string | null
  readonly mapUrl: string
  /** "Open {name} in Maps (opens in a new tab)", resolved. */
  readonly mapLabel: string
  readonly photo: { readonly src: string; readonly width: number; readonly height: number }
}

/** The words every card shares. */
export type StoreCardWords = {
  readonly address: string
  readonly hours: string
  readonly map: string
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
      {/* One of the stores' photographs, not necessarily this store's own (`./store-photos`): the
          words beside it name the store, so the picture is decoration. */}
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
        <h3 className={styles.name}>{store.name}</h3>
        {store.area !== null && <p className={styles.line}>{store.area}</p>}
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
          aria-label={store.mapLabel}
        >
          {words.map}
        </CapsLink>
      </div>
    </li>
  )
}
