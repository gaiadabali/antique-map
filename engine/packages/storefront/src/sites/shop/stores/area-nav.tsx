'use client'

/**
 * The stores page's area sub-nav (the handoff's `Stores`): one link per area, and the area being
 * read marked current — the topmost area inside the band from 160 px under the top of the screen
 * to 55% down it, the handoff's own observer. The current link is kept in view inside the nav's
 * own sideways scroll, never by moving the page. Every word arrives as a prop.
 */
import { useEffect, useRef, useState } from 'react'

import styles from './stores.module.css'

type Area = { readonly anchor: string; readonly label: string }

type Props = { readonly areas: readonly Area[]; readonly label: string }

export function AreaNav({ areas, label }: Props): React.ReactElement {
  const [current, setCurrent] = useState(areas[0]?.anchor ?? null)
  const navRef = useRef<HTMLElement>(null)
  // A clicked link stays marked while the page glides to it: two regions share a row
  // (2026-11-26), and on the way the page passes others, so the observer waits until it stops.
  const gliding = useRef(false)
  const settleRef = useRef<(() => void) | null>(null)

  function mark(anchor: string): void {
    settleRef.current?.()
    setCurrent(anchor)
    gliding.current = true
    // The browser first jumps, then glides: a scroll that ends within 250 ms is that jump.
    const clicked = performance.now()
    let timer = 0
    const settle = () => {
      gliding.current = false
      window.clearTimeout(timer)
      window.removeEventListener('scrollend', ended)
      settleRef.current = null
    }
    const ended = () => {
      if (performance.now() - clicked > 250) settle()
    }
    timer = window.setTimeout(settle, 1500)
    window.addEventListener('scrollend', ended)
    settleRef.current = settle
  }

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (gliding.current) return
        // of two side by side, the left one: the first observed wins a tie (the sort is stable)
        const hit = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        const anchor = hit?.target.getAttribute('aria-labelledby')
        if (anchor) setCurrent(anchor)
      },
      { rootMargin: '-160px 0px -55% 0px' },
    )
    for (const { anchor } of areas) {
      const section = document.getElementById(anchor)?.closest('section')
      if (section) observer.observe(section)
    }
    return () => observer.disconnect()
  }, [areas])

  // keep the current link in sight within the nav's sideways scroll (a phone's narrow row)
  useEffect(() => {
    const nav = navRef.current
    const link = nav?.querySelector<HTMLElement>('[aria-current]')
    if (!nav || !link) return
    const left = link.offsetLeft - nav.offsetLeft
    if (left < nav.scrollLeft || left + link.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollTo({ left: Math.max(0, left - nav.clientWidth / 3) })
    }
  }, [current])

  return (
    <nav ref={navRef} className={styles.areas} aria-label={label}>
      {areas.map((area) => (
        <a
          key={area.anchor}
          href={`#${area.anchor}`}
          className={styles.areaLink}
          aria-current={area.anchor === current ? 'location' : undefined}
          onClick={() => mark(area.anchor)}
        >
          {area.label}
        </a>
      ))}
    </nav>
  )
}
