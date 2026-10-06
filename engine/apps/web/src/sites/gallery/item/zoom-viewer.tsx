'use client'

/**
 * The deep-zoom viewer (5.2.c; EXPERIENCE-GALLERY.md §6): OpenSeadragon inside the shared
 * `ZoomShell`. The tile source is the image's capped IIIF `info.json` when the pyramid exists,
 * else a simple image source — the largest derivative, or the media file (the view model
 * resolves both). Pinch and wheel zoom; the keyboard is OpenSeadragon's own on its focused
 * canvas (+ / − / 0, arrows), with the numeric keypad's + and − added; the shell's buttons zoom,
 * reset and go full screen; the filmstrip switches the image. Everything the viewer shows is also
 * on the page as text — the record and the alt text — so a screen-reader user loses no fact.
 */
import OpenSeadragon from 'openseadragon'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ZoomShell } from '../../../shared/ui'
import styles from './item.module.css'
import type { ZoomViewerProps } from './zoom-lazy'

const STEP = 1.4

export function ZoomViewer({ images, labels }: ZoomViewerProps): React.ReactElement {
  const [at, setAt] = useState(0)
  const [failed, setFailed] = useState(false)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null)
  const current = images[at]

  useEffect(() => {
    const element = viewportRef.current
    if (element === null || current === undefined) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const viewer = OpenSeadragon({
      element,
      tileSources: current.infoUrl ?? { type: 'image', url: current.viewerSrc },
      showNavigationControl: false,
      gestureSettingsTouch: { pinchToZoom: true, flickEnabled: false },
      visibilityRatio: 0.9,
      // prefers-reduced-motion: zoom steps cut instead of animating (§6).
      animationTime: reduced ? 0 : 0.4,
      blendTime: reduced ? 0 : 0.1,
    })
    viewer.addHandler('open-failed', () => setFailed(true))
    viewerRef.current = viewer
    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [current])

  const zoomIn = useCallback(() => viewerRef.current?.viewport?.zoomBy(STEP), [])
  const zoomOut = useCallback(() => viewerRef.current?.viewport?.zoomBy(1 / STEP), [])
  const reset = useCallback(() => viewerRef.current?.viewport?.goHome(), [])

  // OpenSeadragon answers + (=), −, 0 and the arrows on its own canvas and cancels them; the
  // keypad's + and − it does not know, so they are added here — never a key it already took.
  useEffect(() => {
    const element = viewportRef.current
    if (element === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.code === 'NumpadAdd') zoomIn()
      else if (event.code === 'NumpadSubtract') zoomOut()
      else return
      event.preventDefault()
    }
    element.addEventListener('keydown', onKey)
    return () => element.removeEventListener('keydown', onKey)
  }, [zoomIn, zoomOut])

  if (current === undefined) return <div className={styles.zoomEmpty} aria-hidden="true" />

  return (
    <div className={styles.viewer}>
      <ZoomShell
        zoomInLabel={labels.zoomIn}
        zoomOutLabel={labels.zoomOut}
        resetLabel={labels.reset}
        fullscreenLabel={labels.fullScreen}
        lowResolutionNotice={current.lowResolution ? labels.lowResolution : undefined}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={reset}
      >
        <div ref={viewportRef} className={styles.viewport} role="group" aria-label={current.alt} />
      </ZoomShell>
      {failed && (
        <p className={styles.viewerFailed} role="status">
          {labels.failed}
        </p>
      )}
      <p className={styles.viewerHint}>{labels.hint}</p>
      {images.length > 1 && (
        <div className={styles.filmstrip} role="group" aria-label={labels.title}>
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              aria-pressed={index === at}
              className={`${styles.filmstripThumb} ${index === at ? styles.filmstripOn : ''}`}
              onClick={() => {
                setFailed(false)
                setAt(index)
              }}
            >
              {labels.thumbs[index] ?? image.role}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ZoomViewer
