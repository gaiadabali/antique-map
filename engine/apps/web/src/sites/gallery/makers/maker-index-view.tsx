/** The makers index (5.4.a, 14.6; EXPERIENCE-GALLERY.md §7): every published maker as an A–Z
 * index — a row of letters, then a section per initial with the makers in hairline rows. */
import type { SiteLocale } from '@engine/config/sites'

import type { MakerIndexItemVM } from '../../../server/gallery/makers/view-models'
import { SectionHead } from '../../../shared/ui'
import type { MakerText } from './copy'
import { ALPHABET, groupByLetter, letterId } from './letters'
import { makerHref } from './links'
import styles from './makers.module.css'

type Props = {
  readonly items: readonly MakerIndexItemVM[]
  readonly locale: SiteLocale
  readonly t: MakerText
}

export function MakerIndexView({ items, locale, t }: Props) {
  const groups = groupByLetter(items)
  const present = new Set(groups.map((group) => group.letter))
  return (
    <div className={styles.wrap}>
      <section className={styles.opening}>
        <SectionHead
          level={1}
          title={t('makerPage.indexTitle')}
          lede={t('makerPage.indexDescription')}
        />
        <nav aria-label={t('makerPage.lettersLabel')}>
          <ul className={styles.letters}>
            {ALPHABET.map((letter) => (
              <li key={letter}>
                {present.has(letter) ? (
                  <a className={styles.letter} href={`#${letterId(letter)}`}>
                    {letter}
                  </a>
                ) : (
                  <span className={styles.letterOff}>{letter}</span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </section>
      {groups.map((group) => (
        <section
          key={group.letter}
          id={letterId(group.letter)}
          className={styles.group}
          aria-label={group.letter}
        >
          <p className={styles.initial} aria-hidden="true">
            {group.letter}
          </p>
          <ul className={styles.names}>
            {group.items.map((item) => {
              const lifeDates = [item.bornText, item.diedText].filter(Boolean).join('–')
              return (
                <li key={item.slug} className={styles.row}>
                  <a className={styles.name} href={makerHref(item.slug, locale)}>
                    {item.name}
                  </a>
                  <span className={styles.meta}>
                    {[
                      lifeDates,
                      // A maker with no work on show yet carries no "0 works" beside the name.
                      item.workCount > 0 ? t('makerPage.workCount', { count: item.workCount }) : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
