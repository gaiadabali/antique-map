'use client'

/**
 * The checkout's map pin (TASKS.md 6.3.a; EXPERIENCE-SHOP.md §6): inside `MapPinShell`, a Google
 * Maps canvas with Places autocomplete and a draggable pin when the browser key is served (read on
 * the server, passed as a prop — never hard-coded, never logged); without it — the local and CI
 * case — the fallback fully works: paste a Maps link or type lat/lng, both parsed and previewed
 * here and **validated again on the server** (the form's server action, and `/api/x/geocode`).
 * Default centre: Denpasar.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { MapPinShell } from '../../../shared/ui/map-pin-shell'
import styles from './checkout.module.css'

export type Pin = { readonly lat: number; readonly lng: number }

export type PinPickerLabels = {
  readonly useLocation: string
  readonly pasteLink: string
  readonly latLng: string
  readonly latitude: string
  readonly longitude: string
  readonly search: string
}

export type PinPickerProps = {
  /** `GOOGLE_MAPS_BROWSER_KEY`, read on the server; `null` in dev and CI, where the map is not. */
  readonly browserKey: string | null
  readonly labels: PinPickerLabels
  readonly pin: Pin | null
  readonly address: string | null
  readonly onPin: (pin: Pin, address: string | null) => void
}

/** Denpasar, the picker's default centre (EXPERIENCE-SHOP.md §6). */
const DEFAULT_CENTRE: Pin = { lat: -8.6705, lng: 115.2126 }
const SCRIPT_ID = 'google-maps-js'

/* Minimal structural typings for the Maps JavaScript API — no new npm dependency. */
type GLatLng = { lat(): number; lng(): number }
type GListener = { remove(): void }
type GMarker = {
  getPosition(): GLatLng | null
  setPosition(p: GLatLng): void
  addListener(event: string, handler: () => void): GListener
}
type GAutocomplete = {
  getPlace(): { geometry?: { location?: GLatLng } }
  addListener(event: string, handler: () => void): GListener
}
type GMapsNS = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => Record<string, unknown>
  Marker: new (options: Record<string, unknown>) => GMarker
  LatLng: new (lat: number, lng: number) => GLatLng
  places: {
    Autocomplete: new (input: HTMLInputElement, options: Record<string, unknown>) => GAutocomplete
  }
}
type GWindow = Window & {
  google?: { maps: GMapsNS }
}

/** Ask the route for the pin's display address; failure is quiet — the pin still stands. */
async function addressFor(pin: Pin): Promise<string | null> {
  try {
    const response = await fetch('/api/x/geocode', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat: pin.lat, lng: pin.lng }),
    })
    if (!response.ok) return null
    const answer = (await response.json()) as { address?: unknown }
    return typeof answer.address === 'string' ? answer.address : null
  } catch {
    return null
  }
}

function loadMaps(key: string, onReady: (maps: GMapsNS) => void): void {
  const w = window as unknown as GWindow
  const existing = document.getElementById(SCRIPT_ID)
  if (existing !== null) {
    if (w.google?.maps !== undefined) onReady(w.google.maps)
    return
  }
  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.async = true
  script.src =
    `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` + `&libraries=places`
  // The API signals readiness by populating `window.google.maps`; poll briefly rather than
  // threading a global callback name through the bundler.
  let tries = 0
  const timer = window.setInterval(() => {
    if (w.google?.maps !== undefined) {
      window.clearInterval(timer)
      onReady(w.google.maps)
    } else if ((tries += 1) > 100) {
      window.clearInterval(timer)
    }
  }, 100)
  script.addEventListener('error', () => window.clearInterval(timer))
  document.head.appendChild(script)
}

export function PinPicker({
  browserKey,
  labels,
  pin,
  address,
  onPin,
}: PinPickerProps): React.ReactElement {
  const [typed, setTyped] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' })
  const mapDiv = useRef<HTMLDivElement | null>(null)
  const searchInput = useRef<HTMLInputElement | null>(null)
  const marker = useRef<GMarker | null>(null)

  const pick = useCallback(
    (next: Pin, withAddress: boolean) => {
      setTyped({ lat: String(next.lat), lng: String(next.lng) })
      void (async () => {
        const display = withAddress ? await addressFor(next) : null
        onPin(next, display)
      })()
    },
    [onPin],
  )

  // With a key: the map, the draggable pin and Places autocomplete. Without one, no map at all —
  // the fallback below is the whole picker.
  useEffect(() => {
    if (browserKey === null || mapDiv.current === null || searchInput.current === null) return
    let listeners: GListener[] = []
    loadMaps(browserKey, (maps) => {
      if (mapDiv.current === null || searchInput.current === null) return
      const centre = pin ?? DEFAULT_CENTRE
      const map = new maps.Map(mapDiv.current, {
        center: { lat: centre.lat, lng: centre.lng },
        zoom: pin === null ? 12 : 16,
        clickableIcons: false,
      })
      marker.current = new maps.Marker({
        map,
        position: { lat: centre.lat, lng: centre.lng },
        draggable: true,
      })
      listeners.push(
        marker.current.addListener('dragend', () => {
          const position = marker.current?.getPosition()
          if (position !== null && position !== undefined) {
            pick({ lat: position.lat(), lng: position.lng() }, true)
          }
        }),
      )
      const autocomplete = new maps.places.Autocomplete(searchInput.current, {
        componentRestrictions: { country: 'id' },
      })
      listeners.push(
        autocomplete.addListener('place_changed', () => {
          const location = autocomplete.getPlace().geometry?.location
          if (location !== undefined) pick({ lat: location.lat(), lng: location.lng() }, true)
        }),
      )
    })
    return () => {
      for (const listener of listeners) listener.remove()
      listeners = []
    }
    // The map is built once per key; later pin changes move the marker, not the map.
  }, [browserKey])

  // A pin set from outside (the fallback inputs) moves the map's marker too.
  useEffect(() => {
    const maps = (window as unknown as GWindow).google?.maps
    if (browserKey === null || maps === undefined || marker.current === null || pin === null) return
    marker.current.setPosition(new maps.LatLng(pin.lat, pin.lng))
  }, [browserKey, pin])

  const useMyLocation = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (position) => pick({ lat: position.coords.latitude, lng: position.coords.longitude }, true),
      () => undefined,
    )
  }, [pick])

  const pasteLink = useCallback(
    (link: string) => {
      void (async () => {
        try {
          const response = await fetch('/api/x/geocode', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ link }),
          })
          if (!response.ok) return
          const answer = (await response.json()) as {
            lat?: unknown
            lng?: unknown
            address?: unknown
          }
          if (typeof answer.lat !== 'number' || typeof answer.lng !== 'number') return
          onPin(
            { lat: answer.lat, lng: answer.lng },
            typeof answer.address === 'string' ? answer.address : null,
          )
        } catch {
          // A failed parse leaves the pin as it was; the buyer can type lat/lng instead.
        }
      })()
    },
    [onPin],
  )

  const typeLatLng = useCallback(
    (lat: string, lng: string) => {
      setTyped({ lat, lng })
      const parsed = { lat: Number(lat), lng: Number(lng) }
      if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) pick(parsed, true)
    },
    [pick],
  )

  return (
    <div className={styles.pinPicker}>
      <MapPinShell
        map={
          browserKey === null ? null : (
            <div className={styles.mapArea}>
              <input
                ref={searchInput}
                type="text"
                className={styles.search}
                placeholder={labels.search}
                aria-label={labels.search}
              />
              <div ref={mapDiv} className={styles.mapCanvas} />
            </div>
          )
        }
        address={address ?? undefined}
        useLocationLabel={labels.useLocation}
        pasteLinkLabel={labels.pasteLink}
        onUseLocation={useMyLocation}
        onPasteLink={pasteLink}
      />
      <div className={styles.latLng}>
        <span id="checkout-latlng-label">{labels.latLng}</span>
        <input
          type="text"
          inputMode="decimal"
          aria-label={labels.latitude}
          placeholder={labels.latitude}
          value={typed.lat}
          onChange={(event) => typeLatLng(event.target.value, typed.lng)}
        />
        <input
          type="text"
          inputMode="decimal"
          aria-label={labels.longitude}
          placeholder={labels.longitude}
          value={typed.lng}
          onChange={(event) => typeLatLng(typed.lat, event.target.value)}
        />
      </div>
    </div>
  )
}
