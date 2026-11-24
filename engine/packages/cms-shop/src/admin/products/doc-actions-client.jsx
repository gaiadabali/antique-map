'use client'
/**
 * Duplicate and View on the site (TASKS.md 27.2.d). Duplicate is Payload's own duplicate operation
 * (`POST /api/products/:id/duplicate`), which saves the copy as a draft with its SKUs suffixed
 * (`collections/products/duplicate`), then opens the copy. View on the site opens the product's
 * public page in a new tab, or says the product is not on the site yet. `.jsx`: see
 * `../leads/shared.jsx`'s header.
 */
import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { L } from './copy'
import { refusalOf } from './photos'
import './editor.css'

export function DocActionsClient({ id, url, canDuplicate, language }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function duplicate() {
    setBusy(true)
    try {
      const response = await globalThis.fetch(
        `/api/products/${encodeURIComponent(id)}/duplicate?depth=0`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        },
      )
      const json = await response.json().catch(() => null)
      if (!response.ok || !json?.doc?.id) {
        toast.error(`${L('duplicateFailed', language)} ${refusalOf(json, '')}`.trim())
        setBusy(false)
        return
      }
      router.push(`/admin/collections/products/${json.doc.id}`)
    } catch {
      toast.error(L('duplicateFailed', language))
      setBusy(false)
    }
  }

  return (
    <div className="pe-doc-actions">
      {url ? (
        <a className="pe-btn pe-btn--quiet" href={url} target="_blank" rel="noopener noreferrer">
          {L('viewOnSite', language)}
        </a>
      ) : (
        <span className="pe-doc-actions__note">{L('notOnSiteYet', language)}</span>
      )}
      {canDuplicate ? (
        <button
          type="button"
          className="pe-btn pe-btn--quiet"
          disabled={busy}
          aria-busy={busy}
          onClick={() => void duplicate()}
        >
          {busy ? L('duplicating', language) : L('duplicate', language)}
        </button>
      ) : null}
    </div>
  )
}
