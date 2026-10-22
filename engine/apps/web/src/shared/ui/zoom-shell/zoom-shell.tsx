import type { ReactNode } from 'react'

import styles from './zoom-shell.module.css'

export type ZoomShellProps = {
  /** The deep-zoom viewer itself (OpenSeadragon will mount here in 6.3). */
  readonly children?: ReactNode
  readonly zoomInLabel?: string
  readonly zoomOutLabel?: string
  readonly resetLabel?: string
  readonly fullscreenLabel?: string
  readonly lowResolutionNotice?: ReactNode
  readonly onZoomIn?: () => void
  readonly onZoomOut?: () => void
  readonly onReset?: () => void
}

/** Frame for the deep-zoom viewer: viewport slot, zoom controls and a low-resolution notice slot. */
export function ZoomShell({
  children,
  zoomInLabel = 'Zoom in',
  zoomOutLabel = 'Zoom out',
  resetLabel = 'Reset zoom',
  fullscreenLabel = 'Full screen',
  lowResolutionNotice,
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomShellProps): React.ReactElement {
  const toggleFullscreen = () => {
    const element = document.fullscreenElement ? null : document.documentElement
    if (!element) {
      document.exitFullscreen?.().catch(() => undefined)
    } else if (element.requestFullscreen) {
      element.requestFullscreen().catch(() => undefined)
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.viewport}>{children}</div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.button}
          aria-label={zoomInLabel}
          title={zoomInLabel}
          onClick={onZoomIn}
        >
          +
        </button>
        <button
          type="button"
          className={styles.button}
          aria-label={zoomOutLabel}
          title={zoomOutLabel}
          onClick={onZoomOut}
        >
          −
        </button>
        <button
          type="button"
          className={styles.button}
          aria-label={resetLabel}
          title={resetLabel}
          onClick={onReset}
        >
          ⌖
        </button>
        <button
          type="button"
          className={styles.button}
          aria-label={fullscreenLabel}
          title={fullscreenLabel}
          onClick={toggleFullscreen}
        >
          ⛶
        </button>
      </div>

      {lowResolutionNotice && <div className={styles.notice}>{lowResolutionNotice}</div>}
    </div>
  )
}
