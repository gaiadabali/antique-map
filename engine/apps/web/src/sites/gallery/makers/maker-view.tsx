/**
 * One maker page (5.4.a, 14.6; EXPERIENCE-GALLERY.md §7): the name under a level-1 `SectionHead`
 * with life dates and roles as its lede, then the works, available first, then sold, each under a
 * level-2 head through the shared `WorkGrid`. The collection holds no biography yet
 * (`view-models.ts`: it lands with blocks, TASKS.md 9.3.a), so none is drawn. A maker with no
 * available works still shows the sold ones, with the empty state in their place
 * (EXPERIENCE-GALLERY.md §9) — never a dead end.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { MakerVM } from '../../../server/gallery/makers/view-models'
import { ResponsiveImage, SectionHead } from '../../../shared/ui'
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
  const lede = [lifeDates, roles].filter(Boolean).join(' · ')
  return (
    <div className={styles.wrap}>
      <section className={styles.page}>
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
          <SectionHead level={1} title={maker.name} lede={lede !== '' ? lede : undefined} />
        </div>
        <div className={styles.section}>
          <SectionHead level={2} title={t('makerPage.availableHeading')} />
          {maker.available.length > 0 ? (
            <WorkGrid works={maker.available} locale={locale} />
          ) : (
            <p className={styles.empty}>{t('empty.makerAvailable', { maker: maker.name })}</p>
          )}
        </div>
        {maker.sold.length > 0 && (
          <div className={styles.section}>
            <SectionHead level={2} title={t('makerPage.soldHeading')} />
            <WorkGrid works={maker.sold} locale={locale} />
          </div>
        )}
      </section>
    </div>
  )
}
