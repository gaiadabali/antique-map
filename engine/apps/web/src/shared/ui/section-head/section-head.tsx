import type { ReactNode } from 'react'

import styles from './section-head.module.css'

type Props = {
  /**
   * Retired in Outline Colour (phase 17): a heading carries its own weight, so no label sits above
   * it. Accepted so an old caller still compiles; nothing is drawn. Fold any fact it carried into
   * the lede.
   */
  eyebrow?: ReactNode
  title: ReactNode
  lede?: ReactNode
  /** 1 for a page's own head, 2 for a section's. */
  level?: 1 | 2
  /** A link or button at the head's end on a desktop (under it on a phone): "Shop all prints". */
  action?: ReactNode
  /** The heading's id, for a section's `aria-labelledby`. */
  id?: string
  className?: string
}

/** A page's or a section's opening: a balanced serif title, its lede, and an optional action. */
export function SectionHead({ title, lede, level = 2, action, id, className }: Props) {
  const Title = level === 1 ? 'h1' : 'h2'
  return (
    <div className={[styles.head, className ?? ''].filter(Boolean).join(' ')}>
      <div className={styles.text}>
        <Title id={id} className={level === 1 ? styles.titlePage : styles.titleSection}>
          {title}
        </Title>
        {lede !== undefined && <p className={styles.lede}>{lede}</p>}
      </div>
      {action !== undefined && <div className={styles.action}>{action}</div>}
    </div>
  )
}
