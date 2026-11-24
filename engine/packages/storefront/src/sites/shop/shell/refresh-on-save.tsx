'use client'

/**
 * The preview's live half (TASKS.md 27.5.a), Payload's server-side Live Preview: inside the admin's
 * preview frame, a save in the editor (a draft saved, a page published) posts
 * `payload-document-event` to this window, and the page refreshes from the server — which reads
 * the latest draft for the signed-in staff member (`server/shop/pages/preview`). It tells the admin
 * it is ready (`payload-live-preview`, `ready`) and listens to its own origin alone: the admin is
 * the shop's origin, and any other window's message is ignored. Renders nothing.
 */
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function RefreshOnSave() {
  const router = useRouter()
  useEffect(() => {
    const origin = window.location.origin
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return
      const data = event.data as { type?: unknown } | null
      if (typeof data === 'object' && data !== null && data.type === 'payload-document-event') {
        router.refresh()
      }
    }
    window.addEventListener('message', onMessage)
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'payload-live-preview', ready: true }, origin)
    }
    return () => window.removeEventListener('message', onMessage)
  }, [router])
  return null
}
