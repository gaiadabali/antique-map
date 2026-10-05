import type { ReactNode } from 'react'

import styles from './footer.module.css'

type Props = {
  logo: ReactNode
  nav?: ReactNode
  legal?: ReactNode
  social?: ReactNode
  /** The nav landmark's name — needed when a page holds a second footer nav (the style guide). */
  navLabel?: string
}

export function Footer({ logo, nav, legal, social, navLabel }: Props) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo}>{logo}</div>
          {legal && <div className={styles.legal}>{legal}</div>}
        </div>
        {nav && (
          <nav className={styles.nav} aria-label={navLabel}>
            {nav}
          </nav>
        )}
        {social && <div className={styles.social}>{social}</div>}
      </div>
    </footer>
  )
}
