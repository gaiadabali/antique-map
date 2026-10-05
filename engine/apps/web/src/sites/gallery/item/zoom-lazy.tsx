'use client'

/**
 * The deep-zoom viewer's lazy door (5.2.c): a plain "Zoom" button until the visitor opens the
 * viewer — no OpenSeadragon byte loads before that, so the page stays fast
 * (EXPERIENCE-GALLERY.md §6 "loads on intent"). The viewer itself is a client module loaded
 * with `next/dynamic`, `ssr: false` — it mounts OpenSeadragon, which needs the DOM.
 */
import dynamic from 'next/dynamic'
import { useState } from 'react'

import { Button } from '../../../shared/ui'
import { itemText } from './copy'
import styles from './item.module.css'
import type { ZoomViewerProps } from './zoom-viewer'

const ZoomViewer = dynamic<ZoomViewerProps>(() => import('./zoom-viewer').then((m) => m.ZoomViewer), {
  ssr: false,
})

export function ZoomLazy(props: Omit<ZoomViewerProps, 'labels' | 'lowResolutionNotice'>): React.ReactElement {
  const t = itemText(props.locale)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className={styles.zoomDoor}>
        <Button type="button" onClick={() => setOpen(true)}>
          {t('item.viewerOpen')}
        </Button>
      </div>
    )
  }

  return (
    <ZoomViewer
      {...props}
      locale={props.locale}
      labels={{
        title: t('item.viewerTitle'),
        hint: t('item.viewerHint'),
        verso: t('item.versatile'),
      }}
      lowResolutionNotice={t('item.lowResolution')}
    />
  )
}
