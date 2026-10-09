/**
 * The shop home's sections below the best sellers: sets, process, trade and originals. Pictures
 * are placeholders in mats until the owner's content; every word comes from the lexicon.
 */
import { Button, Mat, MatNote, ProofPoints, SectionHead } from '../../../shared/ui'

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

/** "Sets that hang together" needs the collections surface (TASKS.md, phase 6); these three
 * stand in until it ships, placeholder until the owner's content. */
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

export function Sets({ locale, href, t }: SectionProps) {
  return (
    <section className={styles.section}>
      <SectionHead
        eyebrow={t('home.shop.setsEyebrow')}
        title={t('home.shop.setsTitle')}
        lede={t('home.shop.setsBody')}
        action={
          <Button variant="quiet" href={href('collection', {}, locale)}>
            {t('home.shop.setsCta')}
          </Button>
        }
      />
      <div className={styles.three}>
        {SETS.map((set) => (
          <figure key={set.title} className={styles.set}>
            <Mat ratio={4 / 5}>
              <MatNote>{t(set.title)}</MatNote>
            </Mat>
            <figcaption className={styles.caption}>
              <span className={styles.captionTitle}>{t(set.title)}</span>
              <span className={styles.captionBody}>{t(set.body)}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

export function Process({ t }: Pick<SectionProps, 't'>) {
  return (
    <section className={styles.section} id="process">
      <div className={styles.split}>
        <Mat ratio={5 / 4}>
          <MatNote>{t('home.shop.posterWorkshop')}</MatNote>
        </Mat>
        <div>
          <SectionHead
            eyebrow={t('home.shop.processEyebrow')}
            title={t('home.shop.processTitle')}
          />
          <ol className={styles.steps}>
            {STEPS.map((step, at) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.num}>{`0${at + 1}/`}</span>
                <div>
                  <p className={styles.stepTitle}>{t(step.title)}</p>
                  <p className={styles.cardBody}>{t(step.body)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export function Trade({ locale, href, t }: SectionProps) {
  return (
    <section className={`${styles.band} ${styles.bandDark}`}>
      <div className={styles.bandWrap}>
        <div className={styles.split}>
          <div>
            <SectionHead
              eyebrow={t('home.shop.tradeEyebrow')}
              title={t('home.shop.tradeTitle')}
              lede={t('home.shop.tradeBody')}
            />
            <div className={styles.actions}>
              <Button variant="secondary" href={href('partnership', {}, locale)}>
                {t('home.shop.tradeCta')}
              </Button>
            </div>
          </div>
          <ProofPoints className={styles.facts} items={FACTS.map((key) => t(key))} />
        </div>
      </div>
    </section>
  )
}

export function Originals({ sisterHref, t }: { sisterHref: string; t: HomeText }) {
  return (
    <section className={`${styles.band} ${styles.bandTint}`}>
      <div className={styles.bandWrap}>
        <div className={styles.split}>
          <div>
            <SectionHead
              eyebrow={t('home.shop.originalsEyebrow')}
              title={t('home.shop.originalsTitle')}
              lede={t('home.shop.originalsBody')}
            />
            <div className={styles.actions}>
              {/* The bridge to the gallery, which lives on its own host — so absolute, and in
                  the visitor's locale, never hardcoded. */}
              <Button variant="quiet" href={sisterHref}>
                {t('home.shop.originalsCta')}
              </Button>
            </div>
          </div>
          <Mat ratio={5 / 4}>
            <MatNote>{t('home.shop.posterOriginal')}</MatNote>
          </Mat>
        </div>
      </div>
    </section>
  )
}
