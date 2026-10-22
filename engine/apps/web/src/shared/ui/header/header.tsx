'use client'

import { useCallback, useId, useState, type ReactNode } from 'react'

import styles from './header.module.css'

type Props = {
  logo: ReactNode
  nav: ReactNode
  actions: ReactNode
  /** The hamburger's accessible name. Defaults to English; a caller in a lexicon locale passes
   * its own word (qa 4.qa, finding F3 — no component may hold its own English copy). */
  openLabel?: string
  /** The drawer's close button accessible name. */
  closeLabel?: string
  /** The drawer's own accessible name (it is a `role="dialog"`, not the nav landmark). */
  menuLabel?: string
}

export function Header({
  logo,
  nav,
  actions,
  openLabel = 'Open menu',
  closeLabel = 'Close menu',
  menuLabel = 'Menu',
}: Props) {
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
          {/* On a phone the actions move into the drawer: beside the logo they overflow 390 px. */}
          <div className={styles.barActions}>{actions}</div>
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={openLabel}
            onClick={toggle}
          >
            <span className={styles.hamburger} aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && (
        <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={menuLabel}>
          <div className={styles.scrim} onClick={close} aria-hidden="true" />
          <div className={styles.drawer}>
            <div className={styles.drawerHead}>
              <div className={styles.drawerLogo}>{logo}</div>
              <button
                type="button"
                className={styles.closeButton}
                aria-label={closeLabel}
                onClick={close}
              >
                <span className={styles.cross} aria-hidden="true" />
              </button>
            </div>
            {/* A plain box: `nav` is already the named landmark; a second <nav> around it fails
                axe's landmark-unique. A link click inside it closes the drawer. */}
            <div className={styles.mobileNav} onClick={close}>
              {nav}
            </div>
            <div className={styles.drawerActions}>{actions}</div>
          </div>
        </div>
      )}
    </header>
  )
}
