/**
 * The shop home's sections below the best sellers (12.3; Outline Colour 17.2): sets, process, trade
 * and originals. Their pictures are not supplied yet, so each is type on its field — never an
 * empty window. Every word comes from the lexicon.
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

/** "Sets that hang together" stand in for the owner's gallery walls, placeholder until the owner's
 * content. */
const SETS = [
  { title: 'home.shop.set1Title', body: 'home.shop.set1Body' },
  { title: 'home.shop.set2Title', body: 'home.shop.set2Body' },
  { title: 'home.shop.set3Title', body: 'home.shop.set3Body' },
] as const

const STEPS = [
  { title: 'home.shop.processStep1Title', body: 'home.shop.processStep1Body' },
  { title: 'home.shop.processStep2Title', body: 'home.shop.processStep2Body' },
  { title: 'home.shop.processStep3Title', body: 'home.shop.processStep3Body' },
] as const

const FACTS = ['home.shop.tradeFact1', 'home.shop.tradeFact2', 'home.shop.tradeFact3'] as const

/** The sets on the gamboge tint, each one a title and its line: three walls in words. */
export function Sets({ locale, href, t }: SectionProps) {
  return (
    <Band pigment={1} strength="tint" aria-labelledby="home-sets">
      <SectionHead
        id="home-sets"
        title={t('home.shop.setsTitle')}
        lede={t('home.shop.setsBody')}
        action={
          <Button variant="secondary" href={href('collection', {}, locale)}>
            {t('home.shop.setsCta')}
          </Button>
        }
      />
      <ul className={styles.three}>
        {SETS.map((set) => (
          <li key={set.title} className={styles.set}>
            <h3 className={styles.setTitle}>{t(set.title)}</h3>
            <p className={styles.setBody}>{t(set.body)}</p>
          </li>
        ))}
      </ul>
    </Band>
  )
}

/** How a print is made: three steps in order, their numbers set large because the order is the
 * point. */
export function Process({ t }: Pick<SectionProps, 't'>) {
  return (
    <section className={styles.section} id="process" aria-labelledby="home-process">
      <SectionHead id="home-process" title={t('home.shop.processTitle')} />
      <ol className={styles.steps}>
        {STEPS.map((step, at) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.num} aria-hidden="true">
              {at + 1}
            </span>
            <h3 className={styles.stepTitle}>{t(step.title)}</h3>
            <p className={styles.stepBody}>{t(step.body)}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Trade and gifting on the full gamboge: the offer, its facts, and the way in. */
export function Trade({ locale, href, t }: SectionProps) {
  return (
    <Band pigment={1} strength="full" aria-labelledby="home-trade">
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
    </Band>
  )
}

/** The bridge to the gallery's originals wears the gallery's own colour (verdigris): colour names
 * the site. */
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
