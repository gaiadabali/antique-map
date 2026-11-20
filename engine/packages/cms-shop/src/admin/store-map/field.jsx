'use client'
/**
 * A store's location from an address (TASKS.md 27.4.a; the plan's §3.8): the `locationFinder` `ui`
 * field on the store's Location tab, above the latitude and longitude it fills.
 *
 * - **Search** posts what the owner typed — an address, a Google Maps link or `lat, lng` — to the
 *   server's address search (`/api/x/geocode/search`, same origin: the admin's CSP loads nothing
 *   from a third party, so no Maps script runs here) and lists up to five places in Indonesia.
 *   Picking one sets `lat` and `lng`, and the address when it is still empty.
 * - **Check on Google Maps** opens the pin in a new tab: a plain link, nothing embedded.
 * - **Move the pin** nudges it 10, 50 or 250 m north, south, east or west, for the last few metres
 *   a geocoder gets wrong; `lat` and `lng` stay ordinary number fields to type straight into.
 *
 * Nothing saves here: the values go into the store's form, and its Save runs the store's own
 * checks (`collections/stores/pin`: inside Indonesia, required on an active store). A draggable
 * map would need a tile or Maps script origin the admin CSP does not allow — reported, not added.
 * `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { useForm, useFormFields, useTranslation } from '@payloadcms/ui'
import { useState } from 'react'

import { L } from './copy'
import { insideIndonesia, mapsLink, nudge, pinOf, pinText, STEPS } from './geo'
import './store-map.css'

const DIRECTIONS = ['north', 'west', 'east', 'south']

export function StoreLocationField() {
  const { i18n } = useTranslation()
  const language = i18n?.language
  const { dispatchFields, setModified } = useForm()
  const values = useFormFields(([fields]) => ({
    lat: fields?.lat?.value,
    lng: fields?.lng?.value,
    address: fields?.address?.value,
  }))
  const pin = pinOf(values.lat, values.lng)
  const [query, setQuery] = useState('')
  const [step, setStep] = useState(STEPS[0])
  const [answer, setAnswer] = useState({ phase: 'idle' })
  const [message, setMessage] = useState('')

  function set(path, value) {
    dispatchFields({ type: 'UPDATE', path, value })
  }

  function place(next, label) {
    set('lat', next.lat)
    set('lng', next.lng)
    let note = L('pinSet', language, { pin: pinText(next) })
    const address = typeof values.address === 'string' ? values.address.trim() : ''
    if (label && address === '' && !/^-?\d/.test(label)) {
      set('address', label)
      note = `${note} ${L('addressFilled', language)}`
    }
    setModified(true)
    setMessage(note)
  }

  async function search() {
    const text = query.trim()
    if (text === '') return
    setAnswer({ phase: 'searching' })
    try {
      const response = await globalThis.fetch('/api/x/geocode/search', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: text }),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok || !json?.ok) {
        setAnswer({ phase: 'failed', reason: json?.message ?? L('tryAgain', language) })
        return
      }
      setAnswer({ phase: 'answered', candidates: json.candidates ?? [], keyless: json.keyless })
      if (json.candidates?.length === 1 && /^-?\d/.test(json.candidates[0].label)) {
        // A pasted link or a typed pair is one exact pin: set it straight away.
        place(json.candidates[0], null)
      }
    } catch {
      setAnswer({ phase: 'failed', reason: L('tryAgain', language) })
    }
  }

  const candidates = answer.phase === 'answered' ? answer.candidates : []
  return (
    <div className="field-type lc-finder">
      <span className="lc-label" id="lc-label">
        {L('label', language)}
      </span>
      <p className="lc-help">{L('help', language)}</p>
      <label className="lc-mini" htmlFor="lc-query">
        {L('searchLabel', language)}
      </label>
      <div className="lc-search">
        <input
          id="lc-query"
          className="lc-input"
          type="search"
          value={query}
          maxLength={200}
          autoComplete="off"
          placeholder={L('searchPlaceholder', language)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Enter searches; it never submits the store's form.
            if (event.key === 'Enter') {
              event.preventDefault()
              void search()
            }
          }}
        />
        <button
          type="button"
          className="lc-btn lc-btn--primary"
          disabled={answer.phase === 'searching'}
          onClick={() => void search()}
        >
          {answer.phase === 'searching' ? L('searching', language) : L('search', language)}
        </button>
      </div>
      {answer.phase === 'failed' ? (
        <p className="lc-error" role="alert">
          {L('failed', language, { reason: answer.reason })}
        </p>
      ) : null}
      {answer.phase === 'answered' && candidates.length === 0 ? (
        <p className="lc-notice">{L(answer.keyless ? 'keyless' : 'noneFound', language)}</p>
      ) : null}
      {candidates.length > 0 ? (
        <ul className="lc-candidates" aria-label={L('candidates', language)}>
          {candidates.map((candidate) => (
            <li key={`${candidate.lat},${candidate.lng},${candidate.label}`}>
              <button
                type="button"
                className="lc-candidate"
                onClick={() => place(candidate, candidate.label)}
              >
                <span className="lc-candidate__label">{candidate.label}</span>
                <span className="lc-candidate__pin">{pinText(candidate)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="lc-pin">
        {pin ? L('pin', language, { pin: pinText(pin) }) : L('pinNone', language)}
        {pin ? (
          <>
            {' '}
            <a className="lc-link" href={mapsLink(pin)} target="_blank" rel="noopener noreferrer">
              {L('check', language)}
              <span className="lc-hidden"> {L('checkNote', language)}</span>
            </a>
          </>
        ) : null}
      </p>
      {pin && !insideIndonesia(pin) ? (
        <p className="lc-error">{L('pinOutside', language)}</p>
      ) : null}
      {pin ? (
        <fieldset className="lc-move">
          <legend className="lc-mini">{L('moveLegend', language)}</legend>
          <label className="lc-step">
            {L('step', language)}{' '}
            <select
              className="lc-select"
              value={step}
              onChange={(event) => setStep(Number(event.target.value))}
            >
              {STEPS.map((metres) => (
                <option key={metres} value={metres}>
                  {L('metres', language, { n: metres })}
                </option>
              ))}
            </select>
          </label>
          <div className="lc-pad">
            {DIRECTIONS.map((direction) => (
              <button
                key={direction}
                type="button"
                className={`lc-btn lc-pad__${direction}`}
                aria-label={L('moveLabel', language, {
                  n: step,
                  direction: L(direction, language).toLowerCase(),
                })}
                onClick={() => place(nudge(pin, direction, step), null)}
              >
                {L(direction, language)}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <p className="lc-hidden" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
