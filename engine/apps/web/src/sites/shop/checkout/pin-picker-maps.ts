/**
 * Minimal structural typings for the Google Maps JavaScript API (no new npm dependency), and the
 * script loader `pin-picker.tsx`'s map effect uses once the browser key is present — split out so
 * `pin-picker.tsx` stays under 300 lines (AGENTS.md).
 */

/* Minimal structural typings for the Maps JavaScript API — no new npm dependency. */
export type GLatLng = { lat(): number; lng(): number }
export type GListener = { remove(): void }
export type GMarker = {
  getPosition(): GLatLng | null
  setPosition(p: GLatLng): void
  addListener(event: string, handler: () => void): GListener
}
export type GAutocomplete = {
  getPlace(): { geometry?: { location?: GLatLng } }
  addListener(event: string, handler: () => void): GListener
}
export type GMapsNS = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => Record<string, unknown>
  Marker: new (options: Record<string, unknown>) => GMarker
  LatLng: new (lat: number, lng: number) => GLatLng
  places: {
    Autocomplete: new (input: HTMLInputElement, options: Record<string, unknown>) => GAutocomplete
  }
}
export type GWindow = Window & {
  google?: { maps: GMapsNS }
}

const SCRIPT_ID = 'google-maps-js'

export function loadMaps(key: string, onReady: (maps: GMapsNS) => void): void {
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
