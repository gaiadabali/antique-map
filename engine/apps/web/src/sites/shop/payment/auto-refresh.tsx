'use client'

/**
 * Polls the order page while it is visible (EXPERIENCE-SHOP.md §7: "switches to 'Payment received'
 * by itself"), stopping the moment the tab is hidden — the server re-renders on each refresh, so a
 * webhook that lands while the buyer waits needs no extra client state.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const INTERVAL_MS = 5000

export function AutoRefresh(): null {
  const router = useRouter()
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const id = window.setInterval(tick, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [router])
  return null
}
