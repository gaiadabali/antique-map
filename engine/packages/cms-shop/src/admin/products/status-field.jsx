'use client'
/**
 * The product's Draft / Published control (TASKS.md 27.2.a; the plan's §3.2: "a clear button, not
 * in the three-dot menu"), a `ui` field in the main column under the category. It shows where the
 * product stands — a draft, on the site, or on the site with changes not yet published — and
 * moves it with one press, the way Payload's own buttons do:
 *
 * - **Publish** submits the form with `_status: 'published'`, so every rule of publishing runs on
 *   the server (`collections/products/fields`): a missing price, category or photo is refused with
 *   its reason on the field, as with Payload's "Publish changes".
 * - **Back to draft** is Payload's unpublish: `PATCH { _status: 'draft' }` on the saved product.
 *
 * Payload's own Save draft and Publish changes stay in the header. `.jsx`: see
 * `../leads/shared.jsx`'s header. Styled by `./editor.css`.
 */
import {
  toast,
  useConfig,
  useDocumentInfo,
  useForm,
  useLocale,
  useTranslation,
} from '@payloadcms/ui'
import { useState } from 'react'

import { L } from './copy'
import './editor.css'

function stateOf(hasPublishedDoc, unpublishedVersionCount) {
  if (!hasPublishedDoc) return 'draft'
  return unpublishedVersionCount > 0 ? 'changed' : 'published'
}

export function ProductStatusField() {
  const info = useDocumentInfo()
  const { submit, reset } = useForm()
  const { code: locale } = useLocale()
  const { i18n } = useTranslation()
  const { config } = useConfig()
  const [busy, setBusy] = useState(false)
  const language = i18n?.language
  const api = config?.routes?.api ?? '/api'
  const state = stateOf(info.hasPublishedDoc, info.unpublishedVersionCount)
  const allowed = info.hasPublishPermission !== false

  async function publish() {
    setBusy(true)
    try {
      const path = `${api}/products${info.id ? `/${info.id}` : ''}`
      const result = await submit({
        action: `${path}?depth=0&locale=${encodeURIComponent(locale ?? 'en')}`,
        overrides: { _status: 'published' },
      })
      if (result) {
        info.setUnpublishedVersionCount?.(0)
        info.setMostRecentVersionIsAutosaved?.(false)
        info.setHasPublishedDoc?.(true)
      }
    } finally {
      setBusy(false)
    }
  }

  async function unpublish() {
    if (!info.id) return
    setBusy(true)
    try {
      const response = await globalThis.fetch(
        `${api}/products/${info.id}?depth=0&fallback-locale=null`,
        {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json', 'accept-language': language ?? 'en' },
          body: JSON.stringify({ _status: 'draft' }),
        },
      )
      if (!response.ok) throw new Error(String(response.status))
      void reset?.({ ...(info.data ?? {}), _status: 'draft' })
      info.incrementVersionCount?.()
      info.setUnpublishedVersionCount?.(1)
      info.setMostRecentVersionIsAutosaved?.(false)
      info.setHasPublishedDoc?.(false)
      toast.success(L('unpublished', language))
    } catch {
      toast.error(L('unpublishFailed', language))
    } finally {
      setBusy(false)
    }
  }

  const isDraft = state === 'draft'
  const note = isDraft ? 'draftNote' : state === 'changed' ? 'changedNote' : 'publishedNote'
  return (
    <div className="pe-status field-type">
      <span className="pe-label" id="pe-status-label">
        {L('statusLabel', language)}
      </span>
      <div className="pe-status__row">
        <div className="pe-segment" role="group" aria-labelledby="pe-status-label">
          <button
            type="button"
            className="pe-segment__option"
            aria-pressed={isDraft}
            disabled={busy || !allowed || isDraft}
            onClick={unpublish}
          >
            {L('draft', language)}
          </button>
          <button
            type="button"
            className="pe-segment__option"
            aria-pressed={!isDraft}
            disabled={busy || !allowed || !isDraft}
            onClick={publish}
          >
            {L('published', language)}
          </button>
        </div>
        {state === 'changed' && allowed ? (
          <button type="button" className="pe-btn" disabled={busy} onClick={publish}>
            {L('publishChanges', language)}
          </button>
        ) : null}
      </div>
      <p className="pe-help" role="status">
        {L(note, language)}
      </p>
    </div>
  )
}
