/**
 * The cards in their grid (5.1.b): two columns on the phone, four on the desktop — the browse
 * page and the search page show the same cards (EXPERIENCE-GALLERY.md §4).
 */
import type { SiteLocale } from '@engine/config/sites'

import type { WorkCardVM } from '../../../server/gallery/catalogue/view-models'
import styles from './card.module.css'
import { itemHref } from './state-links'
import { WorkCard } from './work-card'

/** The phone's first row (two columns): its cards hold the listing's LCP candidates. */
const LEAD_CARDS = 2

export function WorkGrid({
  works,
  locale,
}: {
  readonly works: readonly WorkCardVM[]
  readonly locale: SiteLocale
}): React.ReactElement {
  return (
    <ul className={styles.grid}>
      {works.map((work, index) => (
        <li key={work.id}>
          <WorkCard
            work={work}
            locale={locale}
            href={itemHref(work.publicId, locale)}
            lead={index < LEAD_CARDS}
          />
        </li>
      ))}
    </ul>
  )
}
