/**
 * The gallery item page's composition (5.2.b, luxury pass 14.5). On a phone it stacks: the title
 * block, the media, the Ask panel, the record. On a desktop the media sit left, the title block
 * and the Ask panel right (the panel sticky), and the record runs beneath on hairline rows
 * (EXPERIENCE-GALLERY.md §5). The gallery never names a price: the panel says *Price on request*,
 * and no number that looks like a price appears anywhere.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ItemView } from '../../../server/gallery/item/view-model'
import { Breadcrumbs, Eyebrow, StockTag, TextLink } from '../../../shared/ui'
import { ChatPageContext } from '../../../shared/chat/chat-page-context'
import { AskPanel } from './ask-panel'
import { creditLine, itemText } from './copy'
import { ItemMedia } from './item-media'
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
  const eyebrow = [
    work.objectType !== null ? t.code('objectType', work.objectType) : null,
    place?.name,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className={styles.page}>
      <ChatPageContext title={h1} />
      <Breadcrumbs items={[{ label: t('item.browse'), href: browseHref }, { label: h1 }]} />

      <div className={styles.layout}>
        <header className={styles.head}>
          {eyebrow !== '' && <Eyebrow mark>{eyebrow}</Eyebrow>}
          <h1 className={styles.title}>{h1}</h1>
          {hasHook && work.originalTitle !== null && (
            <p className={styles.originalTitle} lang={work.originalTitleLanguage ?? undefined}>
              <em>{work.originalTitle}</em>
            </p>
          )}
          {byline !== '' && <p className={styles.byline}>{byline}</p>}
          {work.stockNumber !== null && work.stockNumber !== '' && (
            <p className={styles.stock}>
              <StockTag label={t('label.stockNumber', { stockNumber: work.stockNumber })}>
                {work.stockNumber}
              </StockTag>
            </p>
          )}
        </header>

        <ItemMedia images={work.images} leadIndex={work.primaryIndex} locale={locale} />

        <div className={styles.side}>
          <AskPanel
            work={work}
            locale={locale}
            askHref={askHref}
            emailHref={emailHref ?? null}
            emailAddress={emailAddress ?? null}
            contactMissing={contactMissing ?? false}
          />
        </div>
      </div>

      <ItemRecord work={work} locale={locale} />
      <p className={styles.browseMore}>
        <TextLink href={browseHref}>{t('item.browse')}</TextLink>
      </p>
    </article>
  )
}
