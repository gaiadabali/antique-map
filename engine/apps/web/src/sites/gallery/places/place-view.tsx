/**
 * One place page (5.4.a; EXPERIENCE-GALLERY.md §7): the modern name as H1, historical names under
 * it ("Batavia · Djakarta"), child places, available works, sold works. A place with no available
 * works still shows the sold ones, with the shared lexicon's empty state in their place
 * (EXPERIENCE-GALLERY.md §9) — never a dead end.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { PlaceVM } from '../../../server/gallery/places/view-models'
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
      <section className={styles.section}>
        <h1>{place.name}</h1>
        {historical !== '' && <p className={styles.historical}>{historical}</p>}
        {place.children.length > 0 && (
          <>
            <h2>{t('placePage.childrenHeading', { name: place.name })}</h2>
            <ul className={styles.children}>
              {place.children.map((child) => (
                <li key={child.slug}>
                  <a className={styles.childLink} href={placeHref(child.path, locale)}>
                    {child.name}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <section className={styles.section}>
        <h2>{t('placePage.availableHeading')}</h2>
        {place.available.length > 0 ? (
          <WorkGrid works={place.available} locale={locale} />
        ) : (
          <p className="site-lede">
            {lexiconMessages('gallery', locale).t('empty.placeAvailable', { place: place.name })}
          </p>
        )}
      </section>
      {place.sold.length > 0 && (
        <section className={styles.section}>
          <h2>{t('placePage.soldHeading')}</h2>
          <WorkGrid works={place.sold} locale={locale} />
        </section>
      )}
    </div>
  )
}
