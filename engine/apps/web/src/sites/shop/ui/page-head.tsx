/**
 * A plain page's head in the shop (the redesign of 2026-10-20, the handoff's Bag and Track Order):
 * the 28 px serif title on the white page, and an optional muted line under it. No band: the
 * handoff opens these pages on the page's own white.
 */
import type { ReactNode } from 'react'

import styles from './page-head.module.css'

type Props = {
  readonly id: string
  readonly title: ReactNode
  readonly lede?: ReactNode
}

export function PageHead({ id, title, lede }: Props) {
  return (
    <div className={styles.head}>
      <h1 id={id} className={styles.title}>
        {title}
      </h1>
      {lede ? <p className={styles.lede}>{lede}</p> : null}
    </div>
  )
}
