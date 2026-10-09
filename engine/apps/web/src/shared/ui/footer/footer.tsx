import type { ReactNode } from 'react'

import styles from './footer.module.css'

type Props = {
  logo: ReactNode
  /** The titled link columns (each a `FooterGroup`-shaped block) inside the footer's nav landmark. */
  nav?: ReactNode
  /** The small print along the foot, under a hairline: the legal links, the sister-site link. */
  legal?: ReactNode
  /** The last column: contact lines and accounts. */
  social?: ReactNode
  /** The nav landmark's name — needed when a page holds a second footer nav (the style guide). */
  navLabel?: string
}

export function Footer({ logo, nav, legal, social, navLabel }: Props) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.logo}>{logo}</div>
          {nav && (
            <nav className={styles.nav} aria-label={navLabel}>
              {nav}
            </nav>
          )}
          {social && <div className={styles.social}>{social}</div>}
        </div>
        {legal && <div className={styles.legal}>{legal}</div>}
      </div>
    </footer>
  )
}
