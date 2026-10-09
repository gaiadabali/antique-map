/** The places index (5.4.a, 14.6; EXPERIENCE-GALLERY.md §2, §7): the gazetteer's top-level branches
 * — the island groups and "Beyond Indonesia" — as headed columns, each listing its places on
 * hairline rows; the drill-down links stay (a group's name links to its own page). */
import type { SiteLocale } from '@engine/config/sites'

import type { PlaceChildVM, PlaceIndexNodeVM } from '../../../server/gallery/places/view-models'
import { SectionHead } from '../../../shared/ui'
import type { PlaceText } from './copy'
import { placeHref } from './links'
import styles from './places.module.css'

export type PlaceGroup = {
  readonly root: PlaceIndexNodeVM
  readonly children: readonly PlaceChildVM[]
}

type Props = {
  readonly groups: readonly PlaceGroup[]
  readonly locale: SiteLocale
  readonly t: PlaceText
}

export function PlaceIndexView({ groups, locale, t }: Props) {
  return (
    <div className={styles.wrap}>
      <section className={styles.opening}>
        <SectionHead
          level={1}
          title={t('placePage.indexTitle')}
          lede={t('placePage.indexDescription')}
        />
        <div className={styles.groups}>
          {groups.map(({ root, children }) => (
            <section key={root.slug} className={styles.group}>
              <h2 className={styles.groupName}>
                <a href={placeHref(root.path, locale)}>{root.name}</a>
              </h2>
              {root.childCount > 0 && (
                <p className={styles.meta}>
                  {t('placePage.placeCount', { count: root.childCount })}
                </p>
              )}
              <ul className={styles.rows}>
                {children.map((child) => (
                  <li key={child.slug} className={styles.row}>
                    <a className={styles.link} href={placeHref(child.path, locale)}>
                      {child.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
