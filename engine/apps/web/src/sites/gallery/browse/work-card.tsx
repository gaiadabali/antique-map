/**
 * One work card (5.1.b, 14.1; EXPERIENCE-GALLERY.md §4): the sheet whole on a compact mat —
 * contained, never cropped — then a museum caption: the title, the maker and the date with its
 * precision, the dimensions, ONE status line and the stock-number tag. The gallery never names a
 * price: the line says *Price on request*, *On hold* or *Sold*, and nothing else. The card is one
 * plain `<a>` to the item's `publicId` route — prefetching a listing costs a database read
 * (ARCHITECTURE.md §6). Browse, search, makers, places and the home all show this card.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { WorkCardVM } from '../../../server/gallery/catalogue/view-models'
import { Mat, ResponsiveImage, StockTag } from '../../../shared/ui'
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
 * gutters, the column gap and the mat; on the desktop a quarter of the results column.
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
      <Mat size="compact" fit="contain" ratio={work.image === null ? 1 : undefined}>
        {work.image !== null ? (
          <ResponsiveImage
            variant="fill"
            aspectRatio="1 / 1"
            src={work.image.url}
            srcSet={work.image.srcSet}
            alt={work.image.alt}
            sizes={CARD_IMAGE_SIZES}
            priority={lead}
          />
        ) : // No picture: the window stays empty — the caption below already names the work.
        null}
      </Mat>
      <span className={styles.body}>
        <span className={styles.title}>{work.title}</span>
        {byline !== '' && <span className={styles.meta}>{byline}</span>}
        {work.dimensions !== null && <span className={styles.meta}>{work.dimensions}</span>}
        <span className={styles.foot}>
          <span className={`${styles.status} ${styles[`status-${work.status}`] ?? ''}`}>
            {statusLineOf(work.status, locale)}
          </span>
          {work.stockNumber !== null && work.stockNumber !== '' && (
            <StockTag
              label={browseText(locale)('label.stockNumber', { stockNumber: work.stockNumber })}
            >
              {work.stockNumber}
            </StockTag>
          )}
        </span>
      </span>
    </a>
  )
}
