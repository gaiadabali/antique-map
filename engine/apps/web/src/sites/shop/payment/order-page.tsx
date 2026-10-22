/**
 * The frame every order and simulator state shares (Ivory and ink 18): the page's head sits on
 * the paper with its title (and a lede where a fact belongs under it), then the order's own content
 * runs on the paper in a reading measure. Markup only; the states decide what goes inside.
 */
import type { ReactNode } from 'react'

import { PageHead } from '../ui/page-head'
import styles from './order-view.module.css'

export type OrderPageProps = {
  readonly title: ReactNode
  readonly lede?: ReactNode
  readonly children: ReactNode
}

export function OrderPage({ title, lede, children }: OrderPageProps): React.ReactElement {
  return (
    <div className={styles.page}>
      <PageHead id="order-status" title={title} lede={lede} />
      <div className={styles.content}>{children}</div>
    </div>
  )
}
