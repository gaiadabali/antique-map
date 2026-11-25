/**
 * One store's card on the stores page (13.2): one of the stores' photographs, the address and
 * hours muted, how far it is once the visitor has asked for the nearest (Nearby), and the map
 * link. No name (the UI/UX revision of 2026-11-25): a flagship's or a region's section title says
 * where the store is; a Nearby card, under a title that says nothing of where, opens on its area
 * instead, in ink (the skill review of 2026-11-25), so its cards can be told apart. Every word
 * arrives resolved, so the page (a Server Component) and Nearby (a client island, `./nearby`) draw
 * the same card.
 */
import { CapsLink } from '../ui/caps-link'
import styles from './stores.module.css'

/** A card's own data, ready to draw. */
export type StoreCardData = {
  readonly key: string
  /** The store's area, drawn first — Nearby's cards only; `null` elsewhere. */
  readonly place: string | null
  readonly hours: string | null
  readonly mapUrl: string
  /** The store's own photograph (`alt` from its media record) or a shared one (`alt` empty). */
  readonly photo: {
    readonly src: string
    readonly srcSet?: string
    readonly width: number
    readonly height: number
    readonly alt: string
  }
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
      {/* The store's own photograph when it has one; else one of the shared ones
          (`./store-photos`), which is decoration and has no words of its own. */}
      <img
        className={styles.photo}
        src={store.photo.src}
        srcSet={store.photo.srcSet}
        sizes={store.photo.srcSet ? '96px' : undefined}
        width={store.photo.width}
        height={store.photo.height}
        alt={store.photo.alt}
        loading="lazy"
        decoding="async"
      />
      <div className={styles.storeBody}>
        {store.place !== null && <p className={`${styles.line} ${styles.place}`}>{store.place}</p>}
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
