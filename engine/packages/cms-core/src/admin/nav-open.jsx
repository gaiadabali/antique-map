'use client'
/**
 * The sidebar open on a laptop (TASKS.md 16, the finish review): Payload closes it at 1440 px and
 * under, where it treats it as a modal, so on a 1280 px laptop the owner met a page with no way to
 * see where things are. Above a tablet the open sidebar pushes the page aside rather than covering
 * it, so between 1025 and 1440 px it opens — once for each breakpoint Payload reports, a frame after
 * Payload's own effect has closed it (that effect is a parent's, so it runs after this one). Wider
 * screens keep Payload's rule (open, unless the person closed it); a tablet or phone keeps the
 * closed menu; a person who closes it keeps it closed until the window crosses a breakpoint.
 * Rendered inside the sidebar by `./language-link.jsx`. `.jsx`: see `./leads/shared.jsx`'s header.
 */
import { useNav, useWindowInfo } from '@payloadcms/ui'
import { useEffect, useRef } from 'react'

export function NavOpenOnLaptop() {
  const { hydrated, setNavOpen } = useNav()
  const { breakpoints } = useWindowInfo()
  const underLarge = breakpoints?.l
  const underMid = breakpoints?.m
  const handled = useRef('')
  useEffect(() => {
    if (!hydrated) return
    const state = `${underLarge}:${underMid}`
    if (handled.current === state) return
    handled.current = state
    if (underLarge !== true || underMid !== false) return
    const frame = globalThis.requestAnimationFrame(() => setNavOpen(true))
    return () => globalThis.cancelAnimationFrame(frame)
  }, [hydrated, underLarge, underMid, setNavOpen])
  return null
}
