import type { ReactNode } from 'react'

import { Eyebrow } from '../eyebrow'
import styles from './proof-points.module.css'

type Props = {
  /** Short facts, a few words each, in capitals; three or four read best. */
  items: readonly ReactNode[]
  className?: string
}

/**
 * A row of short facts under a hairline, parted by hairlines: one row on a desktop, where a long
 * fact wraps inside its own cell, and a stack on a phone.
 */
export function ProofPoints({ items, className }: Props) {
  return (
    <ul className={[styles.list, className ?? ''].filter(Boolean).join(' ')}>
      {items.map((item, at) => (
        <li key={at} className={styles.item}>
          <Eyebrow>{item}</Eyebrow>
        </li>
      ))}
    </ul>
  )
}
