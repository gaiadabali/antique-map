/**
 * The gallery home's featured works (ticket 4.3.b): a streamed rail of the most recently
 * published pieces. The read is `loadFeaturedWorks()` (`server/gallery/home`), public-only and
 * price-free; inside `<Suspense>` with a skeleton, and an empty state when the database holds no
 * published work yet — never a crash. No price appears anywhere: the gallery sells by enquiry.
 */
import { Suspense } from 'react'

import { ResponsiveImage, Skeleton, TextLink } from '../../../shared/ui'

import {
  loadFeaturedWorks,
  type FeaturedWork,
} from '../../../server/gallery/home/load-featured-works'
import styles from './home.module.css'
import type { HomeText } from './home-messages'

type Props = {
  readonly locale: 'en' | 'id'
  readonly t: HomeText
}

/** The card link is `/product/{publicId}`; the item route redirects once to its canonical slug. */
function itemHref(publicId: number): string {
  return `/product/${publicId}`
}

export function FeaturedWorks(props: Props) {
  return (
    <Suspense fallback={<WorksSkeleton />}>
      <WorksRail {...props} />
    </Suspense>
  )
}

function WorksSkeleton() {
  return (
    <div className={styles.three} aria-hidden="true">
      {[0, 1, 2].map((at) => (
        <div key={at}>
          <Skeleton width="100%" height="12rem" />
          <Skeleton width="70%" height="1.5rem" />
          <Skeleton width="45%" height="1rem" />
        </div>
      ))}
    </div>
  )
}

async function WorksRail({ locale, t }: Props) {
  let works: readonly FeaturedWork[] = []
  try {
    works = await loadFeaturedWorks(locale)
  } catch {
    works = []
  }
  if (works.length === 0) {
    return (
      <div>
        <h3>{t('home.gallery.emptyTitle')}</h3>
        <p className={styles.cardBody}>{t('home.gallery.emptyBody')}</p>
      </div>
    )
  }
  return (
    <div className={styles.three}>
      {works.map((work, at) => (
        <article key={work.publicId}>
          <span className={styles.num}>{`0${at + 1}/`}</span>
          <h3 className={styles.cardTitle}>{work.title}</h3>
          {work.imageUrl ? (
            // A public derivative, with its ladder: three cards in a row, each a third of the
            // content width (80 rem at most), so a phone loads the 320 px rung, not the top one.
            <ResponsiveImage
              variant="fill"
              aspectRatio="4 / 5"
              className={`${styles.plate} ${styles.platePicture}`}
              src={work.imageUrl}
              srcSet={work.imageSrcSet}
              alt={work.imageAlt}
              sizes="(min-width: 80rem) 25rem, 30vw"
              unoptimized
            />
          ) : (
            <span
              className={styles.plate}
              style={{ aspectRatio: '4 / 5', marginTop: 'var(--space-4)' }}
              aria-hidden="true"
            />
          )}
          <p className={styles.cardBody}>{work.objectType ?? ''}</p>
          <p className={styles.cardBody}>
            <TextLink href={itemHref(work.publicId)}>{t('home.gallery.itemCta')}</TextLink>
          </p>
        </article>
      ))}
    </div>
  )
}
