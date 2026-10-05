/**
 * The gallery item page's composition (5.2.b): title block, the primary image, the deep-zoom
 * door, the record and the Ask panel. On a phone it stacks top to bottom; on a desktop the
 * media sit left and the record and the panel sit right, the panel sticky
 * (EXPERIENCE-GALLERY.md §5). The gallery never names a price: the panel says *Price on
 * request*, and no number that looks like a price appears anywhere.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ItemView } from '../../../server/gallery/item/view-model'
import { Breadcrumbs, ResponsiveImage, TextLink } from '../../../shared/ui'
import { AskPanel } from './ask-panel'
import { itemText } from './copy'
import { ItemRecord } from './item-record'
import styles from './item.module.css'
import { ZoomLazy } from './zoom-lazy'

export function ItemViewComposition({
  work,
  locale,
  askHref,
  browseHref,
}: {
  readonly work: ItemView
  readonly locale: SiteLocale
  /** TODO(5.3): the WhatsApp builder's address replaces the plain contact page. */
  readonly askHref: string
  readonly browseHref: string
}): React.ReactElement {
  const t = itemText(locale)
  const primary = work.images[0] ?? null
  // The hook title where one exists; most migrated works have none, so the original title
  // becomes the H1 and the maker line moves up beside it (§5).
  const hasHook = work.title !== '' && work.title !== work.originalTitle
  const h1 = hasHook ? work.title : (work.originalTitle ?? work.title)
  const makerLine =
    work.maker !== null
      ? `${work.maker.name}${work.maker.role !== '' ? ` (${work.maker.role})` : ''}`
      : null
  const byline = [makerLine, work.date].filter(Boolean).join(', ')

  return (
    <article className={styles.page}>
      <Breadcrumbs items={[{ label: t('item.browse'), href: browseHref }, { label: h1 }]} />
      <header className={styles.head}>
        <h1 className={styles.title}>{h1}</h1>
        {hasHook && work.originalTitle !== null && (
          <p className={styles.originalTitle} lang={work.originalTitleLanguage ?? undefined}>
            <em>{work.originalTitle}</em>
          </p>
        )}
        {byline !== '' && <p className={styles.byline}>{byline}</p>}
        {work.stockNumber !== null && <p className={styles.stock}>{work.stockNumber}</p>}
      </header>

      <div className={styles.columns}>
        <div className={styles.media}>
          {primary !== null && (
            <>
              <ResponsiveImage
                variant="fill"
                aspectRatio={`${primary.width ?? 4} / ${primary.height ?? 3}`}
                src={primary.url}
                alt={primary.alt}
                sizes="(max-width: 1023px) 100vw, 55vw"
                priority
                className={styles.primaryImage}
              />
              {primary.synthetic && <p className={styles.mockupNote}>{t('item.mockup')}</p>}
            </>
          )}
          {work.images.length > 0 && <ZoomLazy images={work.images} locale={locale} />}
        </div>

        <div className={styles.side}>
          <AskPanel work={work} locale={locale} askHref={askHref} />
          <ItemRecord work={work} locale={locale} />
          {work.status !== 'sold' && (
            <p className={styles.browseMore}>
              <TextLink href={browseHref}>{t('item.browse')}</TextLink>
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
