/** The makers index (5.4.a; EXPERIENCE-GALLERY.md §7): every published maker, A–Z, with its life
 * dates and a count of its published works. */
import type { SiteLocale } from '@engine/config/sites'

import type { MakerIndexItemVM } from '../../../server/gallery/makers/view-models'
import type { MakerText } from './copy'
import { makerHref } from './links'
import styles from './makers.module.css'

type Props = {
  readonly items: readonly MakerIndexItemVM[]
  readonly locale: SiteLocale
  readonly t: MakerText
}

export function MakerIndexView({ items, locale, t }: Props) {
  return (
    <div className={styles.wrap}>
      <section className={styles.section}>
        <h1>{t('makerPage.indexTitle')}</h1>
        <p className="site-lede">{t('makerPage.indexDescription')}</p>
        <ul className={styles.indexList}>
          {items.map((item) => {
            const lifeDates = [item.bornText, item.diedText].filter(Boolean).join('–')
            return (
              <li key={item.slug}>
                <a className={styles.indexCard} href={makerHref(item.slug, locale)}>
                  <h2>{item.name}</h2>
                  {lifeDates !== '' && <p className={styles.indexMeta}>{lifeDates}</p>}
                  <p className={styles.indexMeta}>
                    {t('makerPage.workCount', { count: item.workCount })}
                  </p>
                </a>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
