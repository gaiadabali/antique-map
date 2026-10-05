/**
 * One work card (5.1.b; EXPERIENCE-GALLERY.md §4): the image on its mat, contained — never
 * cropped — then the title, the maker and the date with its precision, the dimensions, and ONE
 * status line. The gallery never names a price: the line says *Price on request*, *On hold* or
 * *Sold*, and nothing else. The card is one plain `<a>` to the item's `publicId` route —
 * prefetching a listing costs a database read (ARCHITECTURE.md §6).
 */
import type { SiteLocale } from '@engine/config/sites'

import type { WorkCardVM } from '../../../server/gallery/catalogue/view-models'
import { ResponsiveImage } from '../../../shared/ui'
import { browseText } from './copy'
import styles from './card.module.css'

/** The card's one status line, in the lexicon's words. */
export function statusLineOf(status: WorkCardVM['status'], locale: SiteLocale): string {
  const t = browseText(locale)
  if (status === 'sold') return t('status.sold')
  if (status === 'on-hold') return t('status.onHold')
  return t('price.onRequest')
}

export function WorkCard({
  work,
  locale,
  href,
}: {
  readonly work: WorkCardVM
  readonly locale: SiteLocale
  readonly href: string
}): React.ReactElement {
  const byline = [work.maker?.name, work.date].filter(Boolean).join(', ')
  return (
    <a href={href} className={styles.card}>
      <div className={styles.mat}>
        {work.image !== null ? (
          <ResponsiveImage
            variant="fill"
            aspectRatio="1 / 1"
            src={work.image.url}
            alt={work.image.alt}
            sizes="(max-width: 767px) 50vw, 20vw"
            className={styles.image}
          />
        ) : (
          <div className={styles.noImage} aria-hidden="true" />
        )}
      </div>
      <div className={styles.body}>
        <span className={styles.title}>{work.title}</span>
        {byline !== '' && <span className={styles.meta}>{byline}</span>}
        {work.dimensions !== null && <span className={styles.meta}>{work.dimensions}</span>}
        <span className={`${styles.status} ${styles[`status-${work.status}`] ?? ''}`}>
          {statusLineOf(work.status, locale)}
        </span>
      </div>
    </a>
  )
}
