/**
 * One maker page (5.4.a; EXPERIENCE-GALLERY.md §7): name with life dates and roles, a biography
 * (not in the collection yet — `view-models.ts`'s own note: it lands with blocks, TASKS.md 9.3.a),
 * then the works, available first, then sold. A maker with no available works still shows the
 * sold ones, with the empty state in their place (EXPERIENCE-GALLERY.md §9) — never a dead end.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { MakerVM } from '../../../server/gallery/makers/view-models'
import { ResponsiveImage } from '../../../shared/ui'
import { lexiconMessages, type LexiconMessageKey } from '../../../messages/keys'
import { WorkGrid } from '../browse/work-grid'
import type { MakerText } from './copy'
import styles from './makers.module.css'

type Props = {
  readonly maker: MakerVM
  readonly locale: SiteLocale
  readonly t: MakerText
}

export function MakerView({ maker, locale, t }: Props) {
  const lexicon = lexiconMessages('gallery', locale)
  const lifeDates = [maker.bornText, maker.diedText].filter(Boolean).join('–')
  const roles = maker.roles
    .map((role) => lexicon.t(`maker.role.${role}` as LexiconMessageKey))
    .join(', ')
  return (
    <div className={styles.wrap}>
      <section className={styles.section}>
        {/* No portrait, no empty frame: the name leads (a blank 4:5 box filled a phone's first screen). */}
        <div className={maker.portrait !== null ? styles.header : undefined}>
          {maker.portrait !== null && (
            <ResponsiveImage
              variant="fill"
              aspectRatio="4 / 5"
              src={maker.portrait.url}
              alt={maker.portrait.alt}
              sizes="10rem"
              className={styles.portrait}
            />
          )}
          <div>
            <h1>{maker.name}</h1>
            {(lifeDates !== '' || roles !== '') && (
              <p className={styles.roles}>{[lifeDates, roles].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        </div>
      </section>
      <section className={styles.section}>
        <h2>{t('makerPage.availableHeading')}</h2>
        {maker.available.length > 0 ? (
          <WorkGrid works={maker.available} locale={locale} />
        ) : (
          <p className="site-lede">{t('empty.makerAvailable', { maker: maker.name })}</p>
        )}
      </section>
      {maker.sold.length > 0 && (
        <section className={styles.section}>
          <h2>{t('makerPage.soldHeading')}</h2>
          <WorkGrid works={maker.sold} locale={locale} />
        </section>
      )}
    </div>
  )
}
