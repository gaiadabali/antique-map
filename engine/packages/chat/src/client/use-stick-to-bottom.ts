'use client'

/**
 * Keeps a scrolling log pinned to its newest message — unless the visitor has scrolled up to read
 * something earlier, which a streaming reply must not yank them away from. `force()` pins it
 * regardless (the visitor just sent a message).
 */
import { useCallback, useEffect, useRef, type RefObject } from 'react'

const NEAR_BOTTOM_PX = 80

export function useStickToBottom(
  logRef: RefObject<HTMLElement | null>,
  changeKey: unknown,
): { readonly force: () => void } {
  const stuck = useRef(true)

  useEffect(() => {
    const log = logRef.current
    if (log === null) return
    function onScroll(): void {
      if (log === null) return
      stuck.current = log.scrollHeight - log.scrollTop - log.clientHeight <= NEAR_BOTTOM_PX
    }
    log.addEventListener('scroll', onScroll, { passive: true })
    return () => log.removeEventListener('scroll', onScroll)
  }, [logRef])

  useEffect(() => {
    const log = logRef.current
    if (log !== null && stuck.current) log.scrollTop = log.scrollHeight
  }, [logRef, changeKey])

  const force = useCallback(() => {
    stuck.current = true
  }, [])
  return { force }
}
