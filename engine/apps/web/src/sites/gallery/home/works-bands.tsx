/**
 * The home's two bands that show works (14.3), each streamed inside `<Suspense>` with a skeleton
 * and each omitted — never empty — when it has nothing to show. Both draw the shared work card
 * through `WorkGrid`; neither prints a price (the card says "Sold" and nothing more).
 *
 * - The collection: the four newest available works with a picture, from the catalogue's cached
 *   listing the hero also reads (so it costs nothing), skipping the hero's lead sheet.
 * - Recently placed: the three works most recently marked sold (`loadRecentlyPlaced`).
 */
import { Suspense } from 'react'

import type { SiteLocale } from '@engine/config/sites'

import { EMPTY_STATE, listing, type WorkCardVM } from '../../../server/gallery/catalogue'
import { loadRecentlyPlaced } from '../../../server/gallery/home/load-recently-placed'
import { Button, SectionHead, Skeleton } from '../../../shared/ui'
import { WorkGrid } from '../browse/work-grid'

import { leadWork } from './hero'
import styles from './home.module.css'
import type { HomeText } from './home-messages'

const SHOWN = 4

type Props = {
  readonly locale: SiteLocale
  readonly browseHref: string
  readonly t: HomeText
}

function GridSkeleton({ count }: { readonly count: number }) {
  return (
    <div className={styles.skeletons} aria-hidden="true">
      {Array.from({ length: count }, (_, at) => (
        <div key={at}>
          <Skeleton width="100%" height="14rem" />
          <Skeleton width="70%" height="1.5rem" />
        </div>
      ))}
    </div>
  )
}

async function newestAvailable(locale: SiteLocale): Promise<readonly WorkCardVM[]> {
  try {
    const [all, lead] = await Promise.all([listing(EMPTY_STATE, locale), leadWork(locale)])
    return all.items
      .filter(
        (work) =>
          work.status === 'available' && work.image !== null && work.publicId !== lead?.publicId,
      )
      .slice(0, SHOWN)
  } catch {
    return []
  }
}

export function CollectionBand({ locale, browseHref, t }: Props) {
  return (
    <Suspense
      fallback={<CollectionFrame {...{ browseHref, t }} body={<GridSkeleton count={4} />} />}
    >
      <CollectionWorks locale={locale} browseHref={browseHref} t={t} />
    </Suspense>
  )
}

async function CollectionWorks({ locale, browseHref, t }: Props) {
  const works = await newestAvailable(locale)
  if (works.length === 0) return null
  return (
    <CollectionFrame
      browseHref={browseHref}
      t={t}
      body={<WorkGrid works={works} locale={locale} leads={0} />}
    />
  )
}

function CollectionFrame({
  browseHref,
  t,
  body,
}: {
  readonly browseHref: string
  readonly t: HomeText
  readonly body: React.ReactNode
}) {
  return (
    <section className={styles.section}>
      <SectionHead
        eyebrow={t('home.gallery.featuredEyebrow')}
        title={t('home.gallery.featuredTitle')}
        action={
          <Button variant="quiet" href={browseHref}>
            {t('home.gallery.featuredCta')}
          </Button>
        }
      />
      <div className={styles.grid}>{body}</div>
    </section>
  )
}

export function RecentlyPlacedBand({ locale, t }: Omit<Props, 'browseHref'>) {
  return (
    <Suspense fallback={<RecentlyFrame t={t} body={<GridSkeleton count={3} />} />}>
      <RecentlyWorks locale={locale} t={t} />
    </Suspense>
  )
}

async function RecentlyWorks({ locale, t }: Omit<Props, 'browseHref'>) {
  let works: readonly WorkCardVM[] = []
  try {
    works = await loadRecentlyPlaced(locale)
  } catch {
    works = []
  }
  if (works.length === 0) return null
  return <RecentlyFrame t={t} body={<WorkGrid works={works} locale={locale} leads={0} />} />
}

function RecentlyFrame({ t, body }: { readonly t: HomeText; readonly body: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <SectionHead
        eyebrow={t('home.gallery.recentlyEyebrow')}
        title={t('home.gallery.recentlyTitle')}
        lede={t('home.gallery.recentlyBody')}
      />
      <div className={styles.grid}>{body}</div>
    </section>
  )
}
