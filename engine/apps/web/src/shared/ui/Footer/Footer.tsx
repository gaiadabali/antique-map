import type { ReactNode } from 'react'

import styles from './Footer.module.css'

type Props = {
  logo: ReactNode
  nav?: ReactNode
  legal?: ReactNode
  social?: ReactNode
}

export function Footer({ logo, nav, legal, social }: Props) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo}>{logo}</div>
          {legal && <div className={styles.legal}>{legal}</div>}
        </div>
        {nav && <nav className={styles.nav}>{nav}</nav>}
        {social && <div className={styles.social}>{social}</div>}
      </div>
    </footer>
  )
}
