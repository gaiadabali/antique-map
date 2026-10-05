'use client'

/**
 * The deep-zoom viewer's lazy door (5.2.c): a plain button until the visitor opens the viewer —
 * no OpenSeadragon byte loads before that, so the page stays fast (EXPERIENCE-GALLERY.md §6
 * "loads on intent"). The viewer is a client module loaded with `next/dynamic`, `ssr: false`: it
 * mounts OpenSeadragon, which needs the DOM. The words arrive as props, said on the server, so
 * no lexicon ships to the browser.
 */
import dynamic from 'next/dynamic'
import { useState } from 'react'

import type { ItemImage } from '../../../server/gallery/item/view-model'
import { Button } from '../../../shared/ui'
import styles from './item.module.css'

/** Every word the door and the viewer say, in the page's locale. */
export type ZoomLabels = {
  readonly open: string
  readonly title: string
  readonly hint: string
  readonly zoomIn: string
  readonly zoomOut: string
  readonly reset: string
  readonly fullScreen: string
  /** The shell's honesty notice for a low-resolution legacy photo. */
  readonly lowResolution: string
  /** One name per image, in `images` order, for the filmstrip. */
  readonly thumbs: readonly string[]
}

export type ZoomViewerProps = {
  readonly images: readonly ItemImage[]
  readonly labels: ZoomLabels
}

const ZoomViewer = dynamic<ZoomViewerProps>(
  () => import('./zoom-viewer').then((m) => m.ZoomViewer),
  { ssr: false },
)

export function ZoomLazy(props: ZoomViewerProps): React.ReactElement {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className={styles.zoomDoor}>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {props.labels.open}
        </Button>
      </div>
    )
  }

  return <ZoomViewer {...props} />
}
