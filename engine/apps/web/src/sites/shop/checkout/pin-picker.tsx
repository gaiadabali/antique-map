'use client'

/**
 * The checkout's map pin (TASKS.md 6.3.a; EXPERIENCE-SHOP.md §6): inside `MapPinShell`, a Google
 * Maps canvas with Places autocomplete and a draggable pin when the browser key is served (read on
 * the server, passed as a prop — never hard-coded, never logged); without it — the local and CI
 * case — the fallback fully works: paste a Maps link or type lat/lng, both parsed and previewed
 * here and **validated again on the server** (the form's server action, and `/api/x/geocode`).
 * Default centre: Denpasar.
 */
import { useCallback, useEffect, useRef } from 'react'

import { MapPinShell } from '../../../shared/ui/map-pin-shell'
import styles from './checkout.module.css'
import { loadMaps, type GListener, type GMarker, type GWindow } from './pin-picker-maps'

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
  /** `null` clears the pin — the form's own "no pin" state, not a new one. */
  readonly onPin: (pin: Pin | null, address: string | null) => void
  /** The server refused `delivery.pin` (6-followup-4 #2): marks the fallback inputs invalid. */
  readonly invalid?: boolean
  /** The id of the message `invalid` refers to, for `aria-describedby`. */
  readonly errorId?: string
}

/**
 * A typed coordinate counts only when its trimmed text is non-empty and parses to a finite
 * number — `Number('')` is `0`, which would otherwise read as a pin near (0, 0) while a field is
 * still empty.
 */
export function parseCoordinate(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

/** Denpasar, the picker's default centre (EXPERIENCE-SHOP.md §6). */
const DEFAULT_CENTRE: Pin = { lat: -8.6705, lng: 115.2126 }

/**
 * Picks a pin: `onPin` fires synchronously with the coordinates first — so a submit right after a
 * drag or paste never races the reverse geocode and posts an empty lat/lng (6-followup-4 #1) —
 * then again with the address once it resolves, but only if `latestRef` still names this same pin
 * (a stale answer for an earlier pin must never overwrite a newer one).
 */
export function pickPin(
  next: Pin,
  withAddress: boolean,
  deps: {
    readonly latestRef: { current: Pin | null }
    readonly onPin: (pin: Pin, address: string | null) => void
    readonly resolveAddress: (pin: Pin) => Promise<string | null>
  },
): void {
  deps.latestRef.current = next
  deps.onPin(next, null)
  if (!withAddress) return
  void (async () => {
    const display = await deps.resolveAddress(next)
    if (deps.latestRef.current === next) deps.onPin(next, display)
  })()
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

export function PinPicker({
  browserKey,
  labels,
  pin,
  address,
  onPin,
  invalid,
  errorId,
}: PinPickerProps): React.ReactElement {
  const mapDiv = useRef<HTMLDivElement | null>(null)
  const searchInput = useRef<HTMLInputElement | null>(null)
  const marker = useRef<GMarker | null>(null)
  // Uncontrolled (no `value` prop): written to directly, so hydration never snaps a visitor-typed
  // or externally set (map drag, paste-link, geolocation) value back to blank (6.6.c).
  const latInput = useRef<HTMLInputElement | null>(null)
  const lngInput = useRef<HTMLInputElement | null>(null)
  const latestPin = useRef<Pin | null>(null)

  const setTypedFields = useCallback((lat: string, lng: string) => {
    if (latInput.current) latInput.current.value = lat
    if (lngInput.current) lngInput.current.value = lng
  }, [])

  const pick = useCallback(
    (next: Pin, withAddress: boolean) => {
      setTypedFields(String(next.lat), String(next.lng))
      pickPin(next, withAddress, { latestRef: latestPin, onPin, resolveAddress: addressFor })
    },
    [onPin, setTypedFields],
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
          if (
            typeof answer.lat !== 'number' ||
            typeof answer.lng !== 'number' ||
            !Number.isFinite(answer.lat) ||
            !Number.isFinite(answer.lng)
          )
            return
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
      const parsedLat = parseCoordinate(lat)
      const parsedLng = parseCoordinate(lng)
      if (parsedLat !== null && parsedLng !== null) {
        // Not `pick()`: that writes the parsed numbers back into these two fields, and a buyer
        // typing "115.2126" key by key would have "115." rewritten to "115" under the cursor.
        pickPin({ lat: parsedLat, lng: parsedLng }, true, {
          latestRef: latestPin,
          onPin,
          resolveAddress: addressFor,
        })
      } else {
        onPin(null, null)
      }
    },
    [onPin],
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
          ref={latInput}
          type="text"
          inputMode="decimal"
          aria-label={labels.latitude}
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={errorId}
          placeholder={labels.latitude}
          defaultValue=""
          onChange={(event) => typeLatLng(event.target.value, lngInput.current?.value ?? '')}
        />
        <input
          ref={lngInput}
          type="text"
          inputMode="decimal"
          aria-label={labels.longitude}
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={errorId}
          placeholder={labels.longitude}
          defaultValue=""
          onChange={(event) => typeLatLng(latInput.current?.value ?? '', event.target.value)}
        />
      </div>
    </div>
  )
}
