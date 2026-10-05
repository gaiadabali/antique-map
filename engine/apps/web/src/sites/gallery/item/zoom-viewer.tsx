'use client'

/**
 * The deep-zoom viewer (5.2.c; EXPERIENCE-GALLERY.md §6): OpenSeadragon inside the shared
 * `ZoomShell`, one IIIF `info.json` per image, tiles when the pyramid exists and the largest
 * derivative or the media file when it does not. Pinch, wheel and keyboard (+ / − / 0, arrows)
 * zoom and pan; the filmstrip switches the image. Everything the viewer shows is also on the
 * page as text — the record and the alt text — so a screen-reader user loses no fact.
 */
import OpenSeadragon from 'openseadragon'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { SiteLocale } from '@engine/config/sites'

import type { ItemImage } from '../../../server/gallery/item/view-model'
import { ZoomShell } from '../../../shared/ui'
import styles from './item.module.css'

export type ZoomViewerProps = {
  readonly images: readonly ItemImage[]
  readonly locale: SiteLocale
  readonly labels: {
    readonly title: string
    readonly hint: string
    readonly verso: string
  }
  /** The shell's honesty notice for a low-resolution legacy photo. */
  readonly lowResolutionNotice?: string
}

export function ZoomViewer({
  images,
  labels,
  lowResolutionNotice,
}: ZoomViewerProps): React.ReactElement {
  const [at, setAt] = useState(0)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null)

  const current: ItemImage | undefined = images[at]

  useEffect(() => {
    const element = viewportRef.current
    if (element === null || current === undefined) return
    const viewer = OpenSeadragon({
      element,
      tileSources: current.infoUrl ?? { type: 'image', url: current.viewerSrc },
      showNavigationControl: false,
      showZoomControl: false,
      showHomeControl: false,
      showFullPageControl: false,
      gestureSettingsTouch: { pinchToZoom: true, flickEnabled: false },
      // One-finger pan only once zoomed, so the page still scrolls at rest (§6).
      panHorizontal: true,
      visibilityRatio: 0.9,
      animationTime: 0.4,
      blendTime: 0.1,
    })
    viewerRef.current = viewer
    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [current])

  const zoomIn = useCallback(() => viewerRef.current?.viewport?.zoomBy(1.4), [])
  const zoomOut = useCallback(() => viewerRef.current?.viewport?.zoomBy(1 / 1.4), [])
  const reset = useCallback(() => viewerRef.current?.viewport?.goHome(), [])

  // The keyboard contract: + / − zoom, 0 resets, arrows the viewer's own panning (§6).
  useEffect(() => {
    const element = viewportRef.current
    if (element === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        zoomIn()
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        zoomOut()
      } else if (event.key === '0') {
        event.preventDefault()
        reset()
      }
    }
    element.addEventListener('keydown', onKey)
    return () => element.removeEventListener('keydown', onKey)
  }, [zoomIn, zoomOut, reset])

  if (current === undefined) {
    return <div className={styles.zoomEmpty} aria-hidden="true" />
  }

  return (
    <div className={styles.viewer}>
      <ZoomShell
        lowResolutionNotice={current.lowResolution === true ? lowResolutionNotice : undefined}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={reset}
      >
        <div
          ref={viewportRef}
          className={styles.viewport}
          role="application"
          aria-label={current.alt}
          tabIndex={0}
        />
      </ZoomShell>
      <p className={styles.viewerHint}>{labels.hint}</p>
      {images.length > 1 && (
        <div className={styles.filmstrip} role="tablist" aria-label={labels.title}>
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              role="tab"
              aria-selected={index === at}
              aria-label={image.role === 'verso' ? labels.verso : image.alt}
              className={`${styles.filmstripThumb} ${index === at ? styles.filmstripOn : ''}`}
              onClick={() => setAt(index)}
            >
              {image.role === 'verso' ? labels.verso : image.role}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ZoomViewer
