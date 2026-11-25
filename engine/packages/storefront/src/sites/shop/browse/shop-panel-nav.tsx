'use client'

/**
 * The shop's left panel as it moves (the UI/UX revision of 2026-11-25): on the shop page it
 * follows the sections — the one being read is marked, the last whose title has passed the line
 * just under the sticky header, where a panel link lands it — and Shop all's Sort by branch opens
 * while Shop all is the one. Elsewhere (a "See all", a
 * theme's or a product type's page) it marks the section the page belongs under and leads back to
 * it. On a phone the marked link is kept in view inside the row's own sideways scroll. Every link
 * is a real address, so the panel works without JavaScript; every word arrives as a prop.
 */
import { useEffect, useRef, useState } from 'react'

import styles from './shop-panel.module.css'

export type PanelItem = {
  readonly key: string
  /** The section's id on the shop page. */
  readonly anchor: string
  readonly href: string
  readonly label: string
}

export type PanelSort = { readonly key: string; readonly href: string; readonly label: string }

type Props = {
  readonly label: string
  readonly items: readonly PanelItem[]
  /** The marked item at first (the server's guess, or the page's section). */
  readonly current: string
  /** On the shop page: follow the sections as they scroll. */
  readonly follow: boolean
  /** Shop all's Sort by branch, when this page has it; `current` names the sort in force. */
  readonly sorts?: {
    readonly title: string
    readonly current: string
    readonly items: readonly PanelSort[]
  }
  /** The item whose branch Sort by is. */
  readonly branchOf: string
}

export function ShopPanelNav({ label, items, current, follow, sorts, branchOf }: Props) {
  const [marked, setMarked] = useState(current)
  const rowRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!follow) return
    let frame = 0
    // The section being read: the last whose top has passed the reading line — just under the
    // sticky header (and a phone's chips), where an anchor lands it (the page's scroll padding).
    const update = () => {
      frame = 0
      const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)
      const line = (Number.isFinite(padding) ? padding : 0) + 24
      let key = items[0]?.key
      for (const item of items) {
        const section = document.getElementById(item.anchor)
        if (section && section.getBoundingClientRect().top <= line) key = item.key
      }
      if (key) setMarked(key)
    }
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [follow, items])

  // keep the marked link in sight within the row's sideways scroll (a phone's narrow row)
  useEffect(() => {
    const row = rowRef.current
    const link = row?.querySelector<HTMLElement>('[aria-current]')
    if (!row || !link || row.scrollWidth <= row.clientWidth) return
    const left = link.offsetLeft - row.offsetLeft
    if (left < row.scrollLeft || left + link.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: Math.max(0, left - row.clientWidth / 3) })
    }
  }, [marked])

  return (
    <nav className={styles.panel} aria-label={label}>
      <ul className={styles.views} ref={rowRef}>
        {items.map((item) => (
          <li key={item.key}>
            <a
              href={item.href}
              className={styles.view}
              aria-current={item.key === marked ? 'true' : undefined}
              onClick={() => setMarked(item.key)}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      {sorts && marked === branchOf ? (
        <div className={styles.branch}>
          <p className={styles.branchTitle} id="shop-sort">
            {sorts.title}
          </p>
          <ul className={styles.sorts} aria-labelledby="shop-sort">
            {sorts.items.map((sort) => (
              <li key={sort.key}>
                <a
                  href={sort.href}
                  className={styles.sort}
                  aria-current={sort.key === sorts.current ? 'true' : undefined}
                >
                  {sort.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  )
}
