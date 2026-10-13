/**
 * The shop home's last sections (12.3; Cobalt 19): the trade offer and the bridge to the originals.
 * The placeholder "sets" (walls in words, no picture, no link) were retired in phase 19: the
 * collections in "Shop by" carry the walls. Every word comes from the lexicon.
 */
import { Band, Button, ProofPoints, SectionHead } from '../../../shared/ui'

import styles from './home.module.css'
import type { HomeText } from './home-messages'

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

/** Trade and gifting on the paper, a hairline under the process: the offer, its facts, and the way
 * in (the page's colour is spent on the hero and the bridge to the originals). */
export function Trade({ locale, href, t }: SectionProps) {
  return (
    <section className={styles.ruled} aria-labelledby="home-trade">
      <div className={styles.split}>
        <div>
          <SectionHead
            id="home-trade"
            title={t('home.shop.tradeTitle')}
            lede={t('home.shop.tradeBody')}
          />
          <Button variant="secondary" href={href('partnership', {}, locale)}>
            {t('home.shop.tradeCta')}
          </Button>
        </div>
        <ProofPoints className={styles.facts} items={FACTS.map((key) => t(key))} />
      </div>
    </section>
  )
}

/** The bridge to the gallery's originals wears the gallery's own cool stone: the ground names the
 * site. */
export function Originals({ sisterHref, t }: { sisterHref: string; t: HomeText }) {
  return (
    <Band pigment={3} strength="wash" aria-labelledby="home-originals">
      <SectionHead
        id="home-originals"
        title={t('home.shop.originalsTitle')}
        lede={t('home.shop.originalsBody')}
        action={
          // The bridge to the gallery, which lives on its own host — so absolute, and in the
          // visitor's locale, never hardcoded.
          <Button variant="secondary" href={sisterHref}>
            {t('home.shop.originalsCta')}
          </Button>
        }
      />
    </Band>
  )
}
