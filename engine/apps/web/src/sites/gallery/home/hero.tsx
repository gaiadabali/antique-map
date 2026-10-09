/**
 * The gallery home's hero (14.2): the headline and the owner's facts beside the lead sheet, whole
 * on a paper mat and captioned the way a print room labels a wall — title, maker and date, the
 * stock-number tag and *Price on request*. The sheet is the newest available map with a published
 * image (the headline is "The islands, first drawn."), else the newest available work: the same
 * cached, public, price-free listing read the browse page makes, so no new query. Until it lands,
 * or while the gallery holds no work, the mat keeps its place. No price and no institution appear;
 * every word comes from the gallery's lexicon.
 */
import { Suspense, type ReactNode } from 'react'

import type { SiteLocale } from '@engine/config/sites'

import { EMPTY_STATE, listing, type WorkCardVM } from '../../../server/gallery/catalogue'
import {
  Button,
  Eyebrow,
  Mat,
  MatNote,
  ProofPoints,
  ResponsiveImage,
  Skeleton,
  StockTag,
} from '../../../shared/ui'
import { statusLineOf } from '../browse/work-card'
import { browseText } from '../browse/copy'
import { itemHref } from '../browse/state-links'

import styles from './hero.module.css'
import type { HomeText } from './home-messages'

const FACTS = [
  'home.gallery.heroSince',
  'home.gallery.heroCount',
  'home.gallery.heroCertificate',
] as const

type Props = {
  readonly locale: SiteLocale
  readonly browseHref: string
  readonly sellToUsHref: string
  readonly t: HomeText
}

export function Hero({ locale, browseHref, sellToUsHref, t }: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <Eyebrow mark>{t('home.gallery.eyebrow')}</Eyebrow>
        <h1 className={styles.title}>{t('home.gallery.title')}</h1>
        <p className={`site-lede ${styles.lede}`}>{t('home.gallery.lede')}</p>
        <div className={styles.actions}>
          <Button variant="primary" href={browseHref}>
            {t('home.gallery.heroCtaBrowse')}
          </Button>
          <Button variant="quiet" href={sellToUsHref}>
            {t('home.gallery.sellToUsCta')}
          </Button>
        </div>
      </div>
      <Suspense
        fallback={
          <Frame
            ratio={4 / 5}
            caption={
              <div className={styles.caption} aria-hidden="true">
                <Skeleton width="60%" height="1.5rem" />
              </div>
            }
          >
            {null}
          </Frame>
        }
      >
        <LeadSheet locale={locale} t={t} />
      </Suspense>
      <ProofPoints className={styles.facts} items={FACTS.map((key) => t(key))} />
    </section>
  )
}

/** The sheet's own width over height, held between 4:5 and 3:2 so a long sheet still reads at
 * size; inside, the contained mat keeps every sheet whole whatever its shape. */
export function sheetRatio(image: Pick<NonNullable<WorkCardVM['image']>, 'width' | 'height'>) {
  if (image.width && image.height) return Math.min(1.5, Math.max(0.8, image.width / image.height))
  return 4 / 5
}

export async function leadWork(locale: SiteLocale): Promise<WorkCardVM | null> {
  const ready = (work: WorkCardVM) => work.status === 'available' && work.image !== null
  try {
    const maps = await listing({ ...EMPTY_STATE, objectType: ['map'] }, locale)
    const map = maps.items.find(ready)
    if (map !== undefined) return map
    const all = await listing(EMPTY_STATE, locale)
    return all.items.find(ready) ?? null
  } catch {
    return null
  }
}

async function LeadSheet({ locale, t }: { readonly locale: SiteLocale; readonly t: HomeText }) {
  const lead = await leadWork(locale)
  if (lead === null || lead.image === null) {
    return (
      <Frame ratio={4 / 5}>
        <MatNote>{t('home.gallery.emptyTitle')}</MatNote>
      </Frame>
    )
  }
  const words = browseText(locale)
  const byline = [lead.maker?.name, lead.date].filter(Boolean).join(', ')
  const caption = (
    <figcaption className={styles.caption}>
      <span className={styles.captionText}>
        <a className={styles.captionTitle} href={itemHref(lead.publicId, locale)}>
          {lead.title}
        </a>
        {byline !== '' && <span className={styles.captionMeta}>{byline}</span>}
      </span>
      <span className={styles.captionFoot}>
        <span className={styles.captionMeta}>{statusLineOf(lead.status, locale)}</span>
        {lead.stockNumber !== null && lead.stockNumber !== '' && (
          <StockTag label={words('label.stockNumber', { stockNumber: lead.stockNumber })}>
            {lead.stockNumber}
          </StockTag>
        )}
      </span>
    </figcaption>
  )
  return (
    <Frame caption={caption}>
      {/* The page's largest paint: preloaded at high priority, AVIF where the browser takes it. */}
      <ResponsiveImage
        variant="fill"
        aspectRatio={`${sheetRatio(lead.image)} / 1`}
        src={lead.image.url}
        srcSet={lead.image.srcSet}
        sizes="(max-width: 47.5rem) 100vw, min(45vw, 36rem)"
        alt={lead.image.alt}
        priority
      />
    </Frame>
  )
}

type FrameProps = {
  /** The window's shape, when the picture inside does not carry its own. */
  readonly ratio?: number
  readonly caption?: ReactNode
  readonly children: ReactNode
}

function Frame({ ratio, caption, children }: FrameProps) {
  return (
    <figure className={styles.frame}>
      <Mat ratio={ratio} fit="contain">
        {children}
      </Mat>
      {caption}
    </figure>
  )
}
