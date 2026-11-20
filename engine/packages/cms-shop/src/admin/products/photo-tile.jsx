'use client'
/**
 * One photo of the product (TASKS.md 27.2.b): its picture (the drag handle), "Cover" on the first,
 * its alt text — saved on the image itself when the box is left (`PATCH /api/media/:id`, in the
 * locale being edited) — its caption (the product's own, saved with the product), and buttons to
 * move it earlier or later and to remove it, for a keyboard or a phone where dragging is awkward.
 * `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { useEffect, useState } from 'react'

import { L } from './copy'

const DRAG_TYPE = 'text/x-product-photo'

async function saveAlt(mediaId, alt, locale) {
  const response = await globalThis.fetch(
    `/api/media/${encodeURIComponent(String(mediaId))}?depth=0&locale=${encodeURIComponent(locale)}`,
    {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ alt }),
    },
  )
  return response.ok
}

export function PhotoTile(props) {
  const { index, total, mediaId, thumb, caption, locale, language, locked } = props
  const [alt, setAlt] = useState(thumb?.alt ?? '')
  const [altState, setAltState] = useState('idle')
  const [target, setTarget] = useState(false)
  // A new upload's alt arrives with its record, after the tile may have mounted.
  useEffect(() => {
    if (thumb?.alt) setAlt((current) => (current === '' ? thumb.alt : current))
  }, [thumb?.alt])
  const label = L('photoN', language, { n: index + 1 })
  const altId = `pe-photo-alt-${index}`
  const captionId = `pe-photo-caption-${index}`

  async function leaveAlt() {
    const next = alt.trim()
    if (mediaId === null || locked || next === (thumb?.alt ?? '') || next === '') return
    setAltState('saving')
    const ok = await saveAlt(mediaId, next, locale).catch(() => false)
    setAltState(ok ? 'saved' : 'failed')
    if (ok) props.onAltSaved(mediaId, next)
  }

  return (
    <li
      className={`pe-photo${target ? ' pe-photo--target' : ''}`}
      aria-label={index === 0 ? `${label}, ${L('cover', language)}` : label}
      onDragOver={(event) => {
        if (locked || !event.dataTransfer?.types?.includes(DRAG_TYPE)) return
        event.preventDefault()
        setTarget(true)
      }}
      onDragLeave={() => setTarget(false)}
      onDrop={(event) => {
        const from = Number(event.dataTransfer?.getData(DRAG_TYPE))
        setTarget(false)
        if (!Number.isInteger(from)) return
        event.preventDefault()
        event.stopPropagation()
        props.onMove(from, index)
      }}
    >
      <div
        className="pe-photo__handle"
        draggable={!locked}
        onDragStart={(event) => {
          event.dataTransfer.setData(DRAG_TYPE, String(index))
          event.dataTransfer.effectAllowed = 'move'
        }}
      >
        {thumb?.url ? (
          <img className="pe-photo__img" src={thumb.url} alt="" draggable={false} />
        ) : (
          <span className="pe-photo__img pe-photo__img--none" />
        )}
        {index === 0 ? (
          <span className="pe-tag pe-photo__cover">{L('cover', language)}</span>
        ) : null}
      </div>
      <label className="pe-mini-label" htmlFor={altId}>
        {L('altLabel', language)}
      </label>
      <input
        id={altId}
        className="pe-input"
        value={alt}
        readOnly={locked}
        onChange={(event) => {
          setAlt(event.target.value)
          setAltState('idle')
        }}
        onBlur={() => void leaveAlt()}
      />
      <span className="pe-cell-status" role="status">
        {altState === 'saving' ? L('saving', language) : null}
        {altState === 'saved' ? L('altSaved', language) : null}
        {altState === 'failed' ? L('altFailed', language) : null}
      </span>
      <label className="pe-mini-label" htmlFor={captionId}>
        {L('captionLabel', language)}
      </label>
      <input
        id={captionId}
        className="pe-input"
        value={typeof caption === 'string' ? caption : ''}
        maxLength={200}
        readOnly={locked}
        onChange={(event) => props.onCaption(index, event.target.value)}
      />
      {locked ? null : (
        <div className="pe-photo__actions">
          <button
            type="button"
            className="pe-icon-btn"
            aria-label={`${L('moveEarlier', language)}: ${label}`}
            disabled={index === 0}
            onClick={() => props.onMove(index, index - 1)}
          >
            ←
          </button>
          <button
            type="button"
            className="pe-icon-btn"
            aria-label={`${L('moveLater', language)}: ${label}`}
            disabled={index === total - 1}
            onClick={() => props.onMove(index, index + 1)}
          >
            →
          </button>
          <button
            type="button"
            className="pe-btn pe-btn--quiet"
            aria-label={`${L('removePhoto', language)}: ${label}`}
            onClick={() => props.onRemove(index)}
          >
            {L('removePhoto', language)}
          </button>
        </div>
      )}
    </li>
  )
}
