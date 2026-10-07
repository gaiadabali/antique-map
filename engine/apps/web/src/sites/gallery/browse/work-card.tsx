/**
 * One work card (5.1.b; EXPERIENCE-GALLERY.md §4): the image on its mat, contained — never
 * cropped — then the title, the maker and the date with its precision, the dimensions, and ONE
 * status line. The gallery never names a price: the line says *Price on request*, *On hold* or
 * *Sold*, and nothing else. The card is one plain `<a>` to the item's `publicId` route —
 * prefetching a listing costs a database read (ARCHITECTURE.md §6).
 */
import type { SiteLocale } from '@engine/config/sites'

import type { WorkCardVM } from '../../../server/gallery/catalogue/view-models'
import { ResponsiveImage } from '../../../shared/ui/responsive-image'
import { browseText } from './copy'
import styles from './card.module.css'

/** The card's one status line, in the lexicon's words. */
export function statusLineOf(status: WorkCardVM['status'], locale: SiteLocale): string {
  const t = browseText(locale)
  if (status === 'sold') return t('status.sold')
  if (status === 'on-hold') return t('status.onHold')
  return t('price.onRequest')
}

/**
 * The image's slot, for the browser's pick from the ladder: on the phone half the page less the
 * gutters, the column gap and the mat's padding; on the desktop a quarter of the results column.
 */
const CARD_IMAGE_SIZES = '(min-width: 768px) 15vw, calc(50vw - 3rem)'

export function WorkCard({
  work,
  locale,
  href,
  lead = false,
}: {
  readonly work: WorkCardVM
  readonly locale: SiteLocale
  readonly href: string
  /** A card of the first row, above the fold: its image is fetched eagerly, at high priority. */
  readonly lead?: boolean
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
            srcSet={work.image.srcSet}
            alt={work.image.alt}
            sizes={CARD_IMAGE_SIZES}
            priority={lead}
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
