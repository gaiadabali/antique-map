import type { ReactNode } from 'react'

import styles from './mat.module.css'

type Props = {
  /** The picture (an `<img>`, a `ResponsiveImage`) or a `MatNote` while there is none. */
  children: ReactNode
  /**
   * The window's width over its height. Leave it out when the child carries its own shape (a
   * `ResponsiveImage` with `aspectRatio`); give it for a plain `<img>` or a `MatNote`.
   */
  ratio?: number
  /** `default` for a lead or hero image; `compact` for a card in a grid. */
  size?: 'default' | 'compact'
  className?: string
}

/**
 * A print as a framer mounts it: a paper mat with a hairline edge, weighted at the foot, and a
 * hairline bevel drawn just outside the window (DESIGN-SYSTEM.md §1, the sheet leads). Inside a
 * link, the picture eases closer on hover.
 */
export function Mat({ children, ratio, size = 'default', className }: Props) {
  return (
    <div className={[styles.mat, styles[size], className ?? ''].filter(Boolean).join(' ')}>
      <div
        className={styles.window}
        style={ratio === undefined ? undefined : { aspectRatio: ratio }}
      >
        {children}
      </div>
    </div>
  )
}

/** The words a window shows while it has no picture: centred, small, muted. */
export function MatNote({ children }: { children: ReactNode }) {
  return <span className={styles.note}>{children}</span>
}
