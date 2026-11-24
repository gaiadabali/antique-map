'use client'
/**
 * Dropping, ordering and naming a product's photos (TASKS.md 27.2.b; the plan's §3.2). The rows
 * are the `images` array's own, in the form: an upload adds a row, a drag moves one, Remove takes
 * one out — nothing is saved until the product is (Save draft or Publish), as with Payload's own
 * array. The image records themselves are made at once, through `POST /api/media` as the person,
 * with a product photo's intake filled in (`./photos` `photoUploadData`); their alt text is saved
 * on the image from its tile (`./photo-tile.jsx`).
 *
 * Several files upload at once, three at a time, and join the array in the order they were
 * chosen; the first row is the cover. `.jsx`: see `../leads/shared.jsx`'s header.
 */
import {
  useDocumentInfo,
  useField,
  useForm,
  useFormFields,
  useLocale,
  useTranslation,
} from '@payloadcms/ui'
import { useRef, useState } from 'react'

import { L } from './copy'
import { PhotoTile } from './photo-tile'
import { canUpload, idOf, PHOTO_TYPES, photoFiles, photoUploadData, refusalOf } from './photos'
import './editor.css'

const AT_ONCE = 3

/**
 * One photo to the media library. Payload names a file that already exists `name-1`, `name-2`, … by
 * reading the names taken; two uploads at once can pick the same free name, and the second is
 * refused by the unique file name ("Value must be unique") — phone photos named `photo-1.jpg`,
 * `photo-2.jpg` met it (TASKS.md 27.7). Such a refusal is tried again, a moment later, once the
 * other upload holds its name; nothing was stored by the refused one.
 */
async function upload(file, data, locale, tries = 3) {
  const body = new globalThis.FormData()
  body.set('file', file)
  body.set('_payload', JSON.stringify(data))
  const response = await globalThis.fetch(
    `/api/media?depth=0&locale=${encodeURIComponent(locale)}`,
    { method: 'POST', credentials: 'same-origin', body },
  )
  const json = await response.json().catch(() => null)
  if (response.ok && json?.doc) return json.doc
  const reason = refusalOf(json, String(response.status))
  if (tries > 1 && response.status === 400 && /unique/i.test(JSON.stringify(json ?? ''))) {
    await new Promise((resolve) => globalThis.setTimeout(resolve, 300 + Math.random() * 400))
    return upload(file, data, locale, tries - 1)
  }
  throw new Error(reason)
}

/** Runs `work` over `items`, `limit` at a time, answering each one's outcome in order. */
async function settleAll(items, limit, work) {
  const results = new Array(items.length)
  let next = 0
  const lane = async () => {
    while (next < items.length) {
      const index = next
      next += 1
      try {
        results[index] = { ok: true, value: await work(items[index]) }
      } catch (error) {
        results[index] = { ok: false, error }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane))
  return results
}

export function PhotosClient({ field, path, thumbs: initialThumbs, readOnly }) {
  const { rows = [], errorMessage, showError } = useField({ path, hasRows: true })
  const { addFieldRow, removeFieldRow, moveFieldRow, dispatchFields, setModified } = useForm()
  const fields = useFormFields(([state]) => state)
  const { id, docPermissions } = useDocumentInfo()
  const { code: locale = 'en' } = useLocale()
  const { i18n } = useTranslation()
  const language = i18n?.language
  const input = useRef(null)
  const [thumbs, setThumbs] = useState(initialThumbs ?? {})
  const [pending, setPending] = useState([])
  const [problems, setProblems] = useState([])
  const [over, setOver] = useState(false)
  // The row count as last rendered, read after the uploads finish (not the count when they began).
  const currentRows = useRef(rows.length)
  currentRows.current = rows.length

  const locked = readOnly || docPermissions?.update === false
  const name = typeof fields?.name?.value === 'string' ? fields.name.value : ''
  const ready = canUpload(id, name)
  const photos = rows.map((row, index) => ({
    key: row.id ?? index,
    mediaId: idOf(fields?.[`${path}.${index}.image`]?.value),
    caption: fields?.[`${path}.${index}.caption`]?.value ?? '',
  }))

  async function add(list) {
    const files = photoFiles(Array.from(list ?? []))
    if (files.length === 0 || locked) return
    if (!ready) {
      setProblems([L('nameFirst', language)])
      return
    }
    const data = photoUploadData({ productId: id, name })
    const previews = files.map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      url: globalThis.URL.createObjectURL(file),
    }))
    setProblems([])
    setPending(previews)
    const results = await settleAll(files, AT_ONCE, (file) => upload(file, data, locale))
    const added = {}
    const failed = []
    // Each new row at its own index, after the rows there now (see `./variants-field.jsx`).
    let at = currentRows.current
    results.forEach((result, index) => {
      if (result.ok) {
        const doc = result.value
        added[String(doc.id)] = { url: previews[index].url, alt: doc.alt ?? data.alt ?? '' }
        addFieldRow({
          path,
          rowIndex: at,
          schemaPath: field?.name ?? path,
          subFieldState: { image: { initialValue: null, valid: true, value: doc.id } },
        })
        at += 1
      } else {
        const reason = result.error?.message || L('tryAgain', language)
        failed.push(L('uploadFailed', language, { name: previews[index].name, reason }))
      }
    })
    setThumbs((current) => ({ ...current, ...added }))
    setPending([])
    setProblems(failed)
    if (input.current) input.current.value = ''
  }

  function move(from, to) {
    if (from === to || to < 0 || to >= rows.length) return
    moveFieldRow({ path, moveFromIndex: from, moveToIndex: to })
  }

  function caption(index, value) {
    dispatchFields({ type: 'UPDATE', path: `${path}.${index}.caption`, value })
    setModified(true)
  }

  function remember(mediaId, alt) {
    setThumbs((current) => ({
      ...current,
      [String(mediaId)]: { ...(current[String(mediaId)] ?? { url: null }), alt },
    }))
  }

  return (
    <div className="pe-section field-type" id={`field-${path}`}>
      <span className="pe-label" id="pe-photos-label">
        {L('photosLabel', language)}
      </span>
      <p className="pe-help">{L('photosHelp', language)}</p>
      {locked ? null : (
        <div
          className={`pe-drop${over ? ' pe-drop--over' : ''}`}
          onDragOver={(event) => {
            if (!event.dataTransfer?.types?.includes('Files')) return
            event.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            if (!event.dataTransfer?.files?.length) return
            event.preventDefault()
            setOver(false)
            void add(event.dataTransfer.files)
          }}
        >
          <span className="pe-drop__text">{L('dropHere', language)}</span>
          <label className="pe-btn">
            {L('choosePhotos', language)}
            <input
              ref={input}
              type="file"
              multiple
              accept={PHOTO_TYPES.join(',')}
              className="pe-visually-hidden"
              aria-describedby="pe-photos-label"
              disabled={pending.length > 0}
              onChange={(event) => void add(event.target.files)}
            />
          </label>
        </div>
      )}
      {pending.length > 0 ? (
        <p className="pe-help" role="status" aria-busy="true">
          {L('uploading', language, { n: pending.length })}
        </p>
      ) : null}
      {problems.map((problem) => (
        <p key={problem} className="pe-error" role="alert">
          {problem}
        </p>
      ))}
      {showError && errorMessage ? (
        <p className="pe-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {photos.length === 0 && pending.length === 0 ? (
        <p className="pe-help">{L('noPhotos', language)}</p>
      ) : (
        <ol className="pe-photos" aria-labelledby="pe-photos-label">
          {photos.map((photo, index) => (
            <PhotoTile
              key={photo.key}
              index={index}
              total={photos.length}
              mediaId={photo.mediaId}
              thumb={photo.mediaId === null ? null : thumbs[String(photo.mediaId)]}
              caption={photo.caption}
              locale={locale}
              language={language}
              locked={locked}
              onMove={move}
              onRemove={(at) => removeFieldRow({ path, rowIndex: at })}
              onCaption={caption}
              onAltSaved={remember}
            />
          ))}
          {pending.map((item) => (
            <li key={item.key} className="pe-photo pe-photo--pending" aria-busy="true">
              <img className="pe-photo__img" src={item.url} alt="" />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
