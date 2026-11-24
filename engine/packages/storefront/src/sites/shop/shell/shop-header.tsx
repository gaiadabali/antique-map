'use client'

/**
 * The shop's header (the redesign of 2026-10-20, the handoff's Poster Club skeleton): three equal
 * columns — the links in small capitals at the left, the stacked logo dead centre, the languages,
 * search and the bag at the right — sticky, with a hairline under it, white on every page, the
 * home's hero included (the design pass: one header, no clear variant). On a phone the links and
 * languages move into a full-screen drawer behind the menu button, which slides in from the left
 * and back out when closed (it stays mounted until its exit has played). Every word arrives as a prop.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { useRailSteps } from '../ui/rail-steps'
import styles from './shop-header.module.css'

export type ShopNavLink = {
  readonly href: string
  readonly label: string
  readonly current: boolean
  /** A web address off the shop: opens in a new tab, its label saying so. */
  readonly newTabLabel?: string
}

/** A menu link's new-tab attributes, when it leaves the shop. */
const away = (link: ShopNavLink) =>
  link.newTabLabel
    ? { target: '_blank', rel: 'noopener noreferrer', 'aria-label': link.newTabLabel }
    : {}

type Props = {
  readonly logo: ReactNode
  readonly links: readonly ShopNavLink[]
  readonly locales: ReactNode
  /** The contact details, in the phone's menu (TASKS.md 28.2). */
  readonly contact?: ReactNode
  /** The search toggle (`./search-bar`). */
  readonly search: ReactNode
  readonly bag: ReactNode
  readonly navLabel: string
  readonly openLabel: string
  readonly closeLabel: string
  readonly menuLabel: string
}

export function ShopHeader({
  logo,
  links,
  locales,
  contact,
  search,
  bag,
  navLabel,
  openLabel,
  closeLabel,
  menuLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  // mounted: the drawer stays in the page while its exit plays, then leaves
  const [mounted, setMounted] = useState(false)
  const menuId = useId()
  useRailSteps() // the home's rails (Server Components) step through this one listener
  const closeRef = useRef<HTMLButtonElement>(null)
  const openRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    openRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    // The page behind holds still while the drawer is open. Held at the root, not the body: a body
    // with `overflow: hidden` becomes its own scroller, and the sticky contact bar above the header
    // then rides up out of sight with the page's scroll (the owner's report, 2026-11-24).
    const root = document.documentElement
    const previousRoot = root.style.overflow
    root.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = previousRoot
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  return (
    <header className={styles.header}>
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
                  {...away(link)}
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
                    {...away(link)}
                    onClick={() => setOpen(false)}
                  >
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {contact}
          <div className={styles.drawerLocales}>{locales}</div>
        </div>
      )}
    </header>
  )
}
