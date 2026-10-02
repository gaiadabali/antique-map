import type { ReactNode } from 'react'

import styles from './map-pin-shell.module.css'

export type MapPinShellProps = {
  /** The map itself (Google Maps will be wired here in 6.3). */
  readonly map?: ReactNode
  readonly address?: string
  readonly useLocationLabel?: string
  readonly pasteLinkLabel?: string
  readonly placeholder?: string
  readonly onUseLocation?: () => void
  readonly onPasteLink?: (link: string) => void
}

/** Frame for the checkout pin picker: map slot, address, locate button and a fallback paste input. */
export function MapPinShell({
  map,
  address,
  useLocationLabel = 'Use my location',
  pasteLinkLabel = 'Or paste a Google Maps link',
  placeholder = 'https://maps.app.goo.gl/...',
  onUseLocation,
  onPasteLink,
}: MapPinShellProps): React.ReactElement {
  return (
    <div className={styles.shell}>
      <div className={styles.map}>{map}</div>

      {address && <div className={styles.address}>{address}</div>}

      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={onUseLocation}>
          {useLocationLabel}
        </button>
      </div>

      <form
        className={styles.fallback}
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const link = String(data.get('mapLink') ?? '')
          onPasteLink?.(link)
        }}
      >
        <label htmlFor="map-link" className={styles.label}>
          {pasteLinkLabel}
        </label>
        <input
          id="map-link"
          name="mapLink"
          type="url"
          placeholder={placeholder}
          className={styles.input}
        />
      </form>
    </div>
  )
}
