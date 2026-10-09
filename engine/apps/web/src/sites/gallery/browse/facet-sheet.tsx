'use client'

/**
 * The phone's facet sheet (5.1.b; EXPERIENCE-GALLERY.md §10, §11): below 768 px the facets open
 * in a bottom sheet — a native modal `<dialog>`, which traps focus and closes on Escape — with a
 * sticky footer: Clear, and Apply saying the live count ("Show 34 works"). The facets inside are
 * server-rendered links, so each tap is already applied; Apply closes the sheet on the result.
 */
import { useEffect, useRef } from 'react'

// From its own folder, never the `shared/ui` barrel: a Client Component importing the barrel
// ships every shared component to the browser (5.5 Lighthouse follow-up).
import { Button } from '../../../shared/ui/button'
import styles from './browse.module.css'

export function FacetSheet({
  label,
  apply,
  clearHref,
  clearLabel,
  buttonClassName,
  children,
}: {
  /** The opener's and the sheet's name: the lexicon's `listing.filters`. */
  readonly label: string
  /** The Apply button's words with the live count: “Show 34 works”. */
  readonly apply: string
  /** The footer's Clear: the listing with every filter cleared. */
  readonly clearHref: string
  readonly clearLabel: string
  /** A class for the opener: the listing squares it. */
  readonly buttonClassName?: string
  readonly children: React.ReactNode
}): React.ReactElement {
  const sheet = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = sheet.current
    if (dialog === null) return
    // A click on the backdrop lands on the dialog itself, outside its box: light dismiss.
    const dismiss = (event: MouseEvent): void => {
      const box = dialog.getBoundingClientRect()
      const inside =
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom
      if (event.target === dialog && !inside) dialog.close()
    }
    dialog.addEventListener('click', dismiss)
    return () => dialog.removeEventListener('click', dismiss)
  }, [])

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="small"
        className={buttonClassName}
        onClick={() => sheet.current?.showModal()}
      >
        {label}
      </Button>
      <dialog ref={sheet} className={styles.sheet} aria-label={label}>
        <div className={styles.sheetBody}>{children}</div>
        <div className={styles.sheetFooter}>
          <Button href={clearHref} variant="secondary" className={styles.sheetClear}>
            {clearLabel}
          </Button>
          <Button
            type="button"
            className={styles.sheetApply}
            onClick={() => sheet.current?.close()}
          >
            {apply}
          </Button>
        </div>
      </dialog>
    </>
  )
}
