/**
 * The shop's card (the redesign of 2026-10-20, the handoff's Poster Club card): the print framed
 * on its grey well (the shared `PrintTile`, which the shop's tokens frame and mount), a small white
 * badge at its top left, then two 13 px rows — the name and the price, then a muted line. The whole
 * card is one plain link (no prefetch: a storefront page costs a database read). Every word arrives
 * as a prop.
 */
import type { ReactNode } from 'react'

import { PrintTile, PrintTileNote } from '../../../shared/ui'
import styles from './shop-card.module.css'

type Props = {
  readonly href: string
  /** The print (an image filling the frame), or `null` for the well and the name. */
  readonly picture: ReactNode | null
  /** The print's own width over height (`printRatioOf()`). */
  readonly ratio?: number
  readonly title: string
  /** The right of the first row: a price, a count. */
  readonly aside?: ReactNode
  /** The second row, muted. */
  readonly meta?: ReactNode
  /** A word on the well's corner: Sold out, Digital mockup. */
  readonly badge?: string | null
  /** The heading level a listing gives its card names; a plain span by default. */
  readonly as?: 'h2' | 'h3' | 'span'
}

export function ShopCard({ href, picture, ratio, title, aside, meta, badge, as = 'span' }: Props) {
  const Title = as
  return (
    <a href={href} className={styles.card}>
      <span className={styles.well}>
        {badge ? <span className={styles.badge}>{badge}</span> : null}
        <PrintTile ratio={ratio}>{picture ?? <PrintTileNote>{title}</PrintTileNote>}</PrintTile>
      </span>
      <span className={styles.info}>
        <span className={styles.row}>
          <Title className={styles.title}>{title}</Title>
          {aside !== undefined && <span className={styles.aside}>{aside}</span>}
        </span>
        {meta !== undefined && <span className={`${styles.row} ${styles.meta}`}>{meta}</span>}
      </span>
    </a>
  )
}
