/**
 * The frame every order and simulator state shares (Outline Colour 17.7): a gamboge field opens
 * the page with its title (and a lede where a fact belongs under it), then the order's own content
 * runs on the paper in a reading measure. Markup only; the states decide what goes inside.
 */
import type { ReactNode } from 'react'

import { Band, SectionHead } from '../../../shared/ui'
import styles from './order-view.module.css'

export type OrderPageProps = {
  readonly title: ReactNode
  readonly lede?: ReactNode
  readonly children: ReactNode
}

export function OrderPage({ title, lede, children }: OrderPageProps): React.ReactElement {
  return (
    <div className={styles.page}>
      <Band
        pigment={1}
        strength="wash"
        pad={false}
        className={styles.lead}
        aria-labelledby="order-status"
      >
        <SectionHead
          level={1}
          id="order-status"
          className={styles.leadHead}
          title={title}
          lede={lede}
        />
      </Band>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
