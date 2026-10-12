/**
 * The gallery item page's composition (5.2.b; Ivory and ink 18). The page leads with the shared
 * `Crossing`: on the paper the breadcrumbs, the title block and the Ask block (no panel
 * box), the lead sheet lying whole across the field's lower edge, then on the paper the Zoom door
 * and the other images, and the three proof points. The record runs beneath as a ruled running
 * list, and Browse closes the page. The gallery never names a price: the Ask block says *Price on
 * request*, and no number that looks like a price appears anywhere.
 */
import type { CSSProperties } from 'react'

import type { SiteLocale } from '@engine/config/sites'

import type { ItemView } from '../../../server/gallery/item/view-model'
import { Breadcrumbs, Crossing, StockTag, TextLink } from '../../../shared/ui'
import { ChatPageContext } from '../../../shared/chat/chat-page-context'
import { AskPanel, ItemProof } from './ask-panel'
import { creditLine, itemText } from './copy'
import { LeadPicture, MediaCaption, leadImage, sheetShape } from './item-media'
import { ItemRecord } from './item-record'
import styles from './item.module.css'

export function ItemViewComposition({
  work,
  locale,
  askHref,
  emailHref,
  emailAddress,
  contactMissing,
  browseHref,
}: {
  readonly work: ItemView
  readonly locale: SiteLocale
  /** The WhatsApp builder's `wa.me` address, or the Contact page when no number has arrived. */
  readonly askHref: string
  /** The `mailto:` address beside the Ask button, or `null` while no address has arrived. */
  readonly emailHref?: string | null
  /** The gallery's address, shown as the mail link's text. */
  readonly emailAddress?: string | null
  /** True when neither channel has arrived yet (OA2): the panel then shows the placeholder. */
  readonly contactMissing?: boolean
  readonly browseHref: string
}): React.ReactElement {
  const t = itemText(locale)
  // The hook title where one exists; most migrated works have none, so the original title
  // becomes the H1 and the maker line moves up beside it (§5).
  const hasHook = work.title !== '' && work.title !== work.originalTitle
  const h1 = hasHook ? work.title : (work.originalTitle ?? work.title)
  const makerLine = work.maker !== null ? creditLine(t, work.maker) : null
  const byline = [makerLine, work.date].filter(Boolean).join(', ')
  const place = work.places.find((p) => p.primary) ?? work.places[0] ?? null
  // The type and place, a muted line under the byline: never a label above the heading.
  const facts = [
    work.objectType !== null ? t.code('objectType', work.objectType) : null,
    place?.name,
  ]
    .filter(Boolean)
    .join(' · ')
  const lead = leadImage(work.images, work.primaryIndex)
  const ratio = lead === null ? 4 / 5 : sheetShape(lead)

  return (
    <article className={styles.page}>
      <ChatPageContext title={h1} />
      {/* The Zoom control and the other views stand under the sheet, outside the crossing, so the
          field's edge can fall wherever the copy needs without ever cutting through a control. */}
      <div className={styles.lead}>
        <Crossing
          lead
          pigment={1}
          fit="contain"
          ratio={ratio}
          aria-labelledby="item-title"
          copy={
            <div className={styles.head}>
              <Breadcrumbs items={[{ label: t('item.browse'), href: browseHref }, { label: h1 }]} />
              <h1 id="item-title" className={styles.title}>
                {h1}
              </h1>
              {hasHook && work.originalTitle !== null && (
                <p className={styles.originalTitle} lang={work.originalTitleLanguage ?? undefined}>
                  <em>{work.originalTitle}</em>
                </p>
              )}
              {byline !== '' && <p className={styles.byline}>{byline}</p>}
              {facts !== '' && <p className={styles.facts}>{facts}</p>}
              {work.stockNumber !== null && work.stockNumber !== '' && (
                <p className={styles.stock}>
                  <StockTag label={t('label.stockNumber', { stockNumber: work.stockNumber })}>
                    {work.stockNumber}
                  </StockTag>
                </p>
              )}
              <AskPanel
                work={work}
                locale={locale}
                askHref={askHref}
                emailHref={emailHref ?? null}
                emailAddress={emailAddress ?? null}
                contactMissing={contactMissing ?? false}
              />
            </div>
          }
          aside={<ItemProof locale={locale} />}
          picture={<LeadPicture lead={lead} ratio={ratio} />}
        />
        <div className={styles.mediaBelow} style={{ '--picture-ratio': ratio } as CSSProperties}>
          <MediaCaption images={work.images} leadIndex={work.primaryIndex} locale={locale} />
        </div>
      </div>

      <ItemRecord work={work} locale={locale} />
      <p className={styles.browseMore}>
        <TextLink href={browseHref}>{t('item.browse')}</TextLink>
      </p>
    </article>
  )
}
