import type { ReactNode } from 'react'

import styles from './stock-tag.module.css'

type Props = {
  /** The number as printed on the tag: `M.0500`. */
  children: ReactNode
  /** The whole phrase a screen reader hears in its place: "Stock no. M.0500". */
  label: string
}

/**
 * A work's stock number as the gallery tags it — small spaced capitals in a hairline box, the
 * reference a buyer quotes on WhatsApp (DESIGN-SYSTEM.md §1, a gallery signature). The tag shows
 * the bare number; the label reads it in words.
 */
export function StockTag({ children, label }: Props) {
  return (
    <span className={styles.tag}>
      <span aria-hidden="true">{children}</span>
      <span className={styles.label}>{label}</span>
    </span>
  )
}
