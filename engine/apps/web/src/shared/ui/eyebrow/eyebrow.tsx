import type { ReactNode } from 'react'

import styles from './eyebrow.module.css'

type Props = {
  children: ReactNode
  /**
   * Opens on the site's mark — the shop's scale bar, the gallery's hairline rule: a section's
   * or a page's opening line.
   */
  mark?: boolean
}

export function Eyebrow({ children, mark = false }: Props) {
  if (!mark) return <span className={styles.eyebrow}>{children}</span>
  return (
    <span className={styles.marked}>
      <span className={styles.scale} aria-hidden="true" />
      <span className={styles.eyebrow}>{children}</span>
    </span>
  )
}
