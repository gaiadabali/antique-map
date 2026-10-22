/**
 * The gallery home's hero (14.2; Ivory and ink 18): the headline on the paper, and
 * the lead sheet lying whole across the field's lower edge onto the paper (the shared `Crossing`),
 * captioned the way a print room labels a wall — title, maker and date, the status line and the
 * stock number. No frame and no mat: the sheet lies on the colour. The sheet is the newest
 * available map with a published image (the headline is "The islands, first drawn."), else the
 * newest available work: the same cached, public, price-free listing read the browse page makes,
 * so no new query. Until it lands, or while the gallery holds no work, a window of the stone
 * keeps its place. No price and no institution appear; every word comes from the gallery's lexicon.
 */
import { Suspense, type ReactNode } from 'react'

import type { SiteLocale } from '@engine/config/sites'

import { EMPTY_STATE, listing, type WorkCardVM } from '../../../server/gallery/catalogue'
import {
  Button,
  Crossing,
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

/** An empty window's shape: a sheet's usual portrait. */
const EMPTY_RATIO = 4 / 5

type Props = {
  readonly locale: SiteLocale
  readonly browseHref: string
  readonly sellToUsHref: string
  readonly t: HomeText
}

export function Hero(props: Props) {
  const empty = <div className={styles.empty} style={{ aspectRatio: EMPTY_RATIO }} />
  return (
    <Suspense
      fallback={
        <Frame
          {...props}
          pending
          ratio={EMPTY_RATIO}
          picture={empty}
          caption={<Skeleton width="60%" height="1.5rem" />}
        />
      }
    >
      <LeadSheet {...props} />
    </Suspense>
  )
}

type FrameProps = Props & {
  readonly ratio: number
  readonly picture: ReactNode
  readonly caption?: ReactNode
  /**
   * The placeholder while the read streams. Its title is still the page's h1 (the heading must be in
   * the first HTML, before the read lands: axe and a screen reader meet the page then), but it
   * carries no id and no label, so the finished hero's `home-title` is never a second one.
   */
  readonly pending?: boolean
}

/** The hero around whatever sheet it holds: the copy and facts never wait on the read. */
function Frame({
  browseHref,
  sellToUsHref,
  t,
  ratio,
  picture,
  caption,
  pending = false,
}: FrameProps) {
  return (
    <Crossing
      lead
      ratio={ratio}
      aria-labelledby={pending ? undefined : 'home-title'}
      copy={
        <>
          <h1 id={pending ? undefined : 'home-title'} className={styles.title}>
            {t('home.gallery.title')}
          </h1>
          <p className={`site-lede ${styles.lede}`}>{t('home.gallery.lede')}</p>
          <div className={styles.actions}>
            <Button variant="primary" href={browseHref}>
              {t('home.gallery.heroCtaBrowse')}
            </Button>
            <Button variant="quiet" href={sellToUsHref}>
              {t('home.gallery.sellToUsCta')}
            </Button>
          </div>
        </>
      }
      aside={<ProofPoints className={styles.facts} items={FACTS.map((key) => t(key))} />}
      picture={picture}
      caption={caption}
    />
  )
}

/** The sheet's own width over height, held between 4:5 and 3:2 so a long sheet still reads at
 * size; inside, the picture is contained, so every sheet stays whole whatever its shape. */
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

async function LeadSheet(props: Props) {
  const { locale, t } = props
  const lead = await leadWork(locale)
  if (lead === null || lead.image === null) {
    return (
      <Frame
        {...props}
        ratio={EMPTY_RATIO}
        picture={
          <div className={styles.empty} style={{ aspectRatio: EMPTY_RATIO }}>
            <MatNote>{t('home.gallery.emptyTitle')}</MatNote>
          </div>
        }
      />
    )
  }
  const words = browseText(locale)
  const href = itemHref(lead.publicId, locale)
  const byline = [lead.maker?.name, lead.date].filter(Boolean).join(', ')
  const ratio = sheetRatio(lead.image)
  return (
    <Frame
      {...props}
      ratio={ratio}
      picture={
        // The sheet opens its page too; the caption's title is the one link in the tab order.
        <a className={styles.sheetLink} href={href} tabIndex={-1} aria-hidden="true">
          {/* The page's largest paint: preloaded at high priority, AVIF where the browser takes it. */}
          <ResponsiveImage
            variant="fill"
            aspectRatio={`${ratio} / 1`}
            src={lead.image.url}
            srcSet={lead.image.srcSet}
            sizes="(max-width: 63.99rem) 100vw, 55vw"
            alt={lead.image.alt}
            priority
          />
        </a>
      }
      caption={
        <>
          <a className={styles.captionTitle} href={href}>
            {lead.title}
          </a>
          {byline !== '' && <span className={styles.captionMeta}>{byline}</span>}
          <span className={styles.captionFoot}>
            <span>{statusLineOf(lead.status, locale)}</span>
            {lead.stockNumber !== null && lead.stockNumber !== '' && (
              <StockTag label={words('label.stockNumber', { stockNumber: lead.stockNumber })}>
                {lead.stockNumber}
              </StockTag>
            )}
          </span>
        </>
      }
    />
  )
}
