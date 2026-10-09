/**
 * One place page (5.4.a, 14.6; EXPERIENCE-GALLERY.md §7): the modern name under a level-1
 * `SectionHead` with its historical names as the lede ("Batavia · Djakarta"), the places within it
 * as quiet links, then available works and sold works through the shared `WorkGrid`. A place with
 * no available works still shows the sold ones, with the shared lexicon's empty state in their
 * place (EXPERIENCE-GALLERY.md §9) — never a dead end.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { PlaceVM } from '../../../server/gallery/places/view-models'
import { SectionHead } from '../../../shared/ui'
import { lexiconMessages } from '../../../messages/keys'
import { WorkGrid } from '../browse/work-grid'
import type { PlaceText } from './copy'
import { placeHref } from './links'
import styles from './places.module.css'

type Props = {
  readonly place: PlaceVM
  readonly locale: SiteLocale
  readonly t: PlaceText
}

export function PlaceView({ place, locale, t }: Props) {
  const historical = place.historicalNames.map((each) => each.name).join(' · ')
  return (
    <div className={styles.wrap}>
      <section className={styles.page}>
        <SectionHead
          level={1}
          title={place.name}
          lede={historical !== '' ? historical : undefined}
        />
        {place.children.length > 0 && (
          <nav
            className={styles.within}
            aria-label={t('placePage.childrenHeading', { name: place.name })}
          >
            <p className={styles.meta}>{t('placePage.childrenHeading', { name: place.name })}</p>
            <ul className={styles.rows}>
              {place.children.map((child) => (
                <li key={child.slug} className={styles.row}>
                  <a className={styles.link} href={placeHref(child.path, locale)}>
                    {child.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className={styles.section}>
          <SectionHead level={2} title={t('placePage.availableHeading')} />
          {place.available.length > 0 ? (
            <WorkGrid works={place.available} locale={locale} />
          ) : (
            <p className={styles.empty}>
              {lexiconMessages('gallery', locale).t('empty.placeAvailable', { place: place.name })}
            </p>
          )}
        </div>
        {place.sold.length > 0 && (
          <div className={styles.section}>
            <SectionHead level={2} title={t('placePage.soldHeading')} />
            <WorkGrid works={place.sold} locale={locale} />
          </div>
        )}
      </section>
    </div>
  )
}
