/** The places index (5.4.a; EXPERIENCE-GALLERY.md §2, §7): the gazetteer's top-level branches, a
 * drill-down rather than a flat 100-link list. */
import type { SiteLocale } from '@engine/config/sites'

import type { PlaceIndexNodeVM } from '../../../server/gallery/places/view-models'
import type { PlaceText } from './copy'
import { placeHref } from './links'
import styles from './places.module.css'

type Props = {
  readonly items: readonly PlaceIndexNodeVM[]
  readonly locale: SiteLocale
  readonly t: PlaceText
}

export function PlaceIndexView({ items, locale, t }: Props) {
  return (
    <div className={styles.wrap}>
      <section className={styles.section}>
        <h1>{t('placePage.indexTitle')}</h1>
        <p className="site-lede">{t('placePage.indexDescription')}</p>
        <ul className={styles.indexList}>
          {items.map((item) => (
            <li key={item.slug}>
              <a className={styles.indexCard} href={placeHref(item.path, locale)}>
                <h2>{item.name}</h2>
                {item.childCount > 0 && (
                  <p className={styles.indexMeta}>
                    {t('placePage.placeCount', { count: item.childCount })}
                  </p>
                )}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
