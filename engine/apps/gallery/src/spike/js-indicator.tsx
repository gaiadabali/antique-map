'use client'
/**
 * Says whether this page's JavaScript ran — hydration — so the CSP proof can tell a policy that
 * blocks Next's inline scripts from one that lets them run (ARCHITECTURE.md §13, spike only).
 */
import { useEffect, useState } from 'react'

export function JsIndicator({ off, on }: { readonly off: string; readonly on: string }) {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return <p data-js={hydrated ? 'on' : 'off'}>{hydrated ? on : off}</p>
}
