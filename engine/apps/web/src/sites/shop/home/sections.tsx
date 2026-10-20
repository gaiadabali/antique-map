/**
 * The shop home's last sections (the redesign of 2026-10-20, the handoff's Poster Club story and
 * editorial skeletons): the trade offer — its words at the left, two of the shop's framed prints
 * beside them (no photographs of shops or hotels exist yet) — and the bridge to the originals: two
 * of the gallery's own antiques, one on the left half, one framed in the sister gallery's warm panel
 * with its title and date. Every word is the lexicon.
 */
import { Caps, CapsLink } from '../ui/caps-link'
import { FeaturedPrint } from './featured-print'
import { OriginalPrint } from './original-print'
import type { HomeText } from './home-messages'
import styles from './sections.module.css'

export type SectionProps = {
  readonly locale: 'en' | 'id'
  readonly href: (
    surface: 'browse' | 'partnership' | 'collection',
    params: Record<string, never>,
    locale: 'en' | 'id',
  ) => string
  readonly t: HomeText
}

const FACTS = ['home.shop.tradeFact1', 'home.shop.tradeFact2', 'home.shop.tradeFact3'] as const

/** Trade and gifting: the offer, its facts and the way in, beside two framed prints. */
export function Trade({ locale, href, t }: SectionProps) {
  return (
    <section className={styles.story} aria-labelledby="home-trade">
      <div className={styles.storyText}>
        <h2 id="home-trade" className={styles.storyTitle}>
          {t('home.shop.tradeTitle')}
        </h2>
        <p className={styles.storyLead}>{t('home.shop.tradeLead')}</p>
        <p className={styles.storyBody}>{t('home.shop.tradeBodyMore')}</p>
        <ul className={styles.facts}>
          {FACTS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        <CapsLink href={href('partnership', {}, locale)}>{t('home.shop.tradeCta')}</CapsLink>
      </div>
      <div className={styles.storyPhotos}>
        <FeaturedPrint
          locale={locale}
          index={1}
          sizes="(max-width: 56.25rem) 80vw, 33vw"
          className={styles.photo}
        />
        <FeaturedPrint
          locale={locale}
          index={2}
          sizes="(max-width: 56.25rem) 80vw, 33vw"
          className={styles.photo}
        />
      </div>
    </section>
  )
}

/** The bridge to the gallery's originals, on its own host (absolute, in the visitor's locale). */
export function Originals({
  locale,
  sisterHref,
  t,
}: {
  readonly locale: 'en' | 'id'
  readonly sisterHref: string
  readonly t: HomeText
}) {
  return (
    <section className={styles.edit} aria-labelledby="home-originals">
      <div className={styles.editPhoto}>
        <OriginalPrint locale={locale} index={0} sizes="50vw" className={styles.editWall} />
      </div>
      <div className={styles.editPanel}>
        <Caps className={styles.label}>{t('home.shop.originalsLabel')}</Caps>
        <h2 id="home-originals" className={styles.editTitle}>
          {t('home.shop.originalsTitle')}
        </h2>
        <div className={styles.editArt}>
          <OriginalPrint
            locale={locale}
            index={1}
            sizes="20rem"
            className={styles.editTile}
            captioned
          />
        </div>
        <p className={styles.editBody}>{t('home.shop.originalsBody')}</p>
        <CapsLink href={sisterHref}>{t('home.shop.originalsCta')}</CapsLink>
      </div>
    </section>
  )
}
