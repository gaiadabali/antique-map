/**
 * The gallery item page's composition (5.2.b): title block, the lead image, the deep-zoom door,
 * the Ask panel and the record. On a phone it stacks top to bottom; on a desktop the media sit
 * left and the panel and the record sit right, the panel sticky (EXPERIENCE-GALLERY.md §5). The
 * gallery never names a price: the panel says *Price on request*, and no number that looks like
 * a price appears anywhere.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ItemImage, ItemView } from '../../../server/gallery/item/view-model'
import { Breadcrumbs, ResponsiveImage, TextLink } from '../../../shared/ui'
import { AskPanel } from './ask-panel'
import { creditLine, itemText, type ItemText } from './copy'
import { ItemRecord } from './item-record'
import styles from './item.module.css'
import { ZoomLazy, type ZoomLabels } from './zoom-lazy'

/** The viewer's words, said on the server so no lexicon ships to the browser. */
function zoomLabels(t: ItemText, images: readonly ItemImage[]): ZoomLabels {
  return {
    open: t('item.viewerOpen'),
    title: t('item.viewerTitle'),
    hint: t('item.viewerHint'),
    zoomIn: t('item.zoomIn'),
    zoomOut: t('item.zoomOut'),
    reset: t('item.zoomReset'),
    fullScreen: t('item.fullScreen'),
    lowResolution: t('item.lowResolution'),
    // One name per image for the filmstrip: its role, and a synthetic image's label first.
    thumbs: images.map((image) => {
      const role = t.code('image.role', image.role)
      return image.syntheticLabel === null
        ? role
        : `${t.code('image.synthetic', image.syntheticLabel)}: ${role}`
    }),
  }
}

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
  // The lead is the first photographed recto; a work without one leads with its first image.
  const lead = work.images[work.primaryIndex] ?? work.images[0] ?? null
  // The hook title where one exists; most migrated works have none, so the original title
  // becomes the H1 and the maker line moves up beside it (§5).
  const hasHook = work.title !== '' && work.title !== work.originalTitle
  const h1 = hasHook ? work.title : (work.originalTitle ?? work.title)
  const makerLine = work.maker !== null ? creditLine(t, work.maker) : null
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
        {work.stockNumber !== null && (
          <p className={styles.stock}>
            {t('label.stockNumber', { stockNumber: work.stockNumber })}
          </p>
        )}
      </header>

      <div className={styles.columns}>
        <div className={styles.media}>
          {lead !== null && (
            <>
              <ResponsiveImage
                variant="fill"
                aspectRatio={`${lead.width ?? 4} / ${lead.height ?? 3}`}
                src={lead.url}
                alt={lead.alt}
                sizes="(max-width: 1023px) 100vw, 55vw"
                priority
                className={styles.primaryImage}
              />
              {lead.syntheticLabel !== null && (
                <p className={styles.mockupNote}>
                  {t.code('image.synthetic', lead.syntheticLabel)}
                </p>
              )}
            </>
          )}
          {work.images.length > 0 && (
            <ZoomLazy images={work.images} labels={zoomLabels(t, work.images)} />
          )}
        </div>

        <div className={styles.side}>
          <AskPanel work={work} locale={locale} askHref={askHref} />
          <ItemRecord work={work} locale={locale} />
          <p className={styles.browseMore}>
            <TextLink href={browseHref}>{t('item.browse')}</TextLink>
          </p>
        </div>
      </div>
    </article>
  )
}
