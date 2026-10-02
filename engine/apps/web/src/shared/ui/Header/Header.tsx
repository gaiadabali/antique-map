'use client'

import { useCallback, useId, useState, type ReactNode } from 'react'

import styles from './Header.module.css'

type Props = {
  logo: ReactNode
  nav: ReactNode
  actions: ReactNode
}

export function Header({ logo, nav, actions }: Props) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((prev) => !prev), [])
  const close = useCallback(() => setOpen(false), [])
  const menuId = useId()

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.logo}>{logo}</div>
        <div className={styles.desktopNav} id={menuId}>
          {nav}
        </div>
        <div className={styles.actions}>
          {actions}
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls={menuId}
            aria-label="Open menu"
            onClick={toggle}
          >
            <span className={styles.hamburger} aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && (
        <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Menu">
          <div className={styles.scrim} onClick={close} aria-hidden="true" />
          <div className={styles.drawer}>
            <div className={styles.drawerHead}>
              <div className={styles.drawerLogo}>{logo}</div>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Close menu"
                onClick={close}
              >
                <span className={styles.cross} aria-hidden="true" />
              </button>
            </div>
            <nav className={styles.mobileNav} onClick={close}>
              {nav}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
