'use client'

/**
 * Snap's pop-up (COMMERCE.md §6; EXPERIENCE-SHOP.md §7): loads Midtrans's own script for the
 * attempt's token — never a `NEXT_PUBLIC_*` client key, only the one the pay action's server
 * response carried — and falls back to the plain redirect when the script cannot load (an in-app
 * browser that blocks it, an ad blocker, or the pop-up closing with no result).
 */
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    snap?: {
      pay(token: string, options: Record<string, unknown>): void
    }
  }
}

export type SnapPayProps = {
  readonly token: string
  readonly clientKey: string
  readonly scriptSrc: string
  readonly redirectUrl: string
  readonly onSettled: () => void
  readonly onClosed: () => void
}

/** Opens Snap's pop-up as soon as it mounts; the caller unmounts it once the page moves on. */
export function SnapPay({
  token,
  clientKey,
  scriptSrc,
  redirectUrl,
  onSettled,
  onClosed,
}: SnapPayProps): React.ReactElement {
  const opened = useRef(false)

  useEffect(() => {
    let cancelled = false
    const script = document.createElement('script')
    script.src = scriptSrc
    script.setAttribute('data-client-key', clientKey)
    script.async = true
    script.onload = () => {
      if (cancelled || opened.current || !window.snap) {
        if (!cancelled && !window.snap) window.location.assign(redirectUrl)
        return
      }
      opened.current = true
      window.snap.pay(token, {
        onSuccess: onSettled,
        onPending: onSettled,
        onError: onClosed,
        onClose: onClosed,
      })
    }
    script.onerror = () => {
      if (!cancelled) window.location.assign(redirectUrl)
    }
    document.body.appendChild(script)
    return () => {
      cancelled = true
      document.body.removeChild(script)
    }
  }, [token, clientKey, scriptSrc, redirectUrl, onSettled, onClosed])

  return <noscript>{redirectUrl}</noscript>
}
