'use client'

/**
 * The shop's header (the redesign of 2026-10-20, the handoff's Poster Club skeleton): three equal
 * columns — the links in small capitals at the left, the stacked logo dead centre, the languages,
 * search and the bag at the right — sticky, with a hairline under it. On the home it lies clear
 * over the hero until the page has scrolled 30 px, then turns white. On a phone the links and
 * languages move into a full-screen drawer behind the menu button, which slides in from the left
 * and back out when closed (it stays mounted until its exit has played). Every word arrives as a prop.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

import styles from './shop-header.module.css'

export type ShopNavLink = {
  readonly href: string
  readonly label: string
  readonly current: boolean
}

type Props = {
  readonly logo: ReactNode
  readonly links: readonly ShopNavLink[]
  readonly locales: ReactNode
  /** The search toggle (`./search-bar`). */
  readonly search: ReactNode
  readonly bag: ReactNode
  /** Clear over the hero until the page scrolls (the home). */
  readonly overlay?: boolean
  readonly navLabel: string
  readonly openLabel: string
  readonly closeLabel: string
  readonly menuLabel: string
}

const SCROLLED_AT = 30

export function ShopHeader({
  logo,
  links,
  locales,
  search,
  bag,
  overlay = false,
  navLabel,
  openLabel,
  closeLabel,
  menuLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  // mounted: the drawer stays in the page while its exit plays, then leaves
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const openRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!overlay) return
    const onScroll = () => setScrolled(window.scrollY > SCROLLED_AT)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overlay])

  const close = useCallback(() => {
    setOpen(false)
    openRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const clear = overlay && !scrolled && !open

  return (
    <header className={styles.header} data-clear={clear || undefined}>
      <div className={styles.left}>
        <button
          ref={openRef}
          type="button"
          className={styles.burger}
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={openLabel}
          onClick={() => {
            setMounted(true)
            setOpen(true)
          }}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        <nav className={styles.nav} aria-label={navLabel}>
          <ul className={styles.navList}>
            {links.map((link) => (
              <li key={link.href}>
                <a
                  className={styles.navLink}
                  href={link.href}
                  aria-current={link.current ? 'page' : undefined}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className={styles.logo}>{logo}</div>
      <div className={styles.right}>
        <div className={styles.locales}>{locales}</div>
        {search}
        {bag}
      </div>

      {mounted && (
        <div
          className={styles.drawer}
          data-state={open ? 'open' : 'closing'}
          aria-hidden={open ? undefined : true}
          onAnimationEnd={(event) => {
            if (!open && event.target === event.currentTarget) setMounted(false)
          }}
          id={menuId}
          role="dialog"
          aria-modal="true"
          aria-label={menuLabel}
        >
          <div className={styles.drawerTop}>
            <div className={styles.drawerLogo}>{logo}</div>
            <button
              ref={closeRef}
              type="button"
              className={styles.cross}
              aria-label={closeLabel}
              onClick={close}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          </div>
          <nav aria-label={navLabel} className={styles.drawerNav}>
            <ul>
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={link.current ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.drawerLocales}>{locales}</div>
        </div>
      )}
    </header>
  )
}
