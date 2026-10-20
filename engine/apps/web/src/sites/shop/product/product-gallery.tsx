'use client'

/**
 * The product page's gallery (the redesign of 2026-10-20, the handoff's King & McGaw gallery): one
 * view at a time on a white stage, the other views as small buttons under it, and Enlarge, which
 * opens the chosen view large in a dialog (Escape, the close button or the backdrop close it, and
 * focus goes back to Enlarge). The pictures are rendered on the server and handed in; this part
 * only chooses which one shows. Every word is a prop.
 */
import { useState, type ReactNode } from 'react'

import { Dialog } from '../../../shared/ui'
import styles from './product-gallery.module.css'

export type GalleryView = {
  /** The view on the stage (a framed `PrintTile`). */
  readonly stage: ReactNode
  /** The same view, small, for its button. */
  readonly thumb: ReactNode
  /** The same view, large, for the dialog. */
  readonly large: ReactNode
  /** A synthetic image's label, shown under the stage; `null` for a photograph. */
  readonly note: string | null
  /** The button's accessible name ("View 2"). */
  readonly label: string
}

type Props = {
  readonly views: readonly GalleryView[]
  /** The stage when there is no picture at all. */
  readonly empty: ReactNode
  readonly enlargeLabel: string
  readonly dialogTitle: string
  readonly closeLabel: string
  readonly viewsLabel: string
}

export function ProductGallery({
  views,
  empty,
  enlargeLabel,
  dialogTitle,
  closeLabel,
  viewsLabel,
}: Props) {
  const [at, setAt] = useState(0)
  const [open, setOpen] = useState(false)
  const view = views[at]
  return (
    <div className={styles.gallery}>
      <div className={styles.stage}>{view ? view.stage : empty}</div>
      {view?.note ? <span className={styles.note}>{view.note}</span> : null}
      {views.length > 1 && (
        <ul className={styles.thumbs} aria-label={viewsLabel}>
          {views.map((each, index) => (
            <li key={index}>
              <button
                type="button"
                className={styles.thumb}
                aria-label={each.label}
                aria-pressed={index === at}
                onClick={() => setAt(index)}
              >
                {each.thumb}
              </button>
              {each.note ? <span className={styles.thumbNote}>{each.note}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {view ? (
        <>
          <div className={styles.under}>
            <button type="button" className={styles.enlarge} onClick={() => setOpen(true)}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
              {enlargeLabel}
            </button>
          </div>
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            title={dialogTitle}
            closeLabel={closeLabel}
          >
            <div className={styles.large}>{view.large}</div>
            {view.note ? <span className={styles.note}>{view.note}</span> : null}
          </Dialog>
        </>
      ) : null}
    </div>
  )
}
