/**
 * How a print is made, on the shop home (the redesign of 2026-10-20, the handoff's Poster Club USP
 * band): a full-bleed warm band, the title centred above three centred columns, each opened by its
 * numeral in the logo's umber. Every word comes from the lexicon.
 */
import type { HomeText } from './home-messages'
import styles from './process.module.css'

const STEPS = [
  { title: 'home.shop.processStep1Title', body: 'home.shop.processStep1Body' },
  { title: 'home.shop.processStep2Title', body: 'home.shop.processStep2Body' },
  { title: 'home.shop.processStep3Title', body: 'home.shop.processStep3Body' },
] as const

export function Process({ t }: { t: HomeText }) {
  return (
    <section id="process" className={styles.band} aria-labelledby="home-process">
      <h2 id="home-process" className={styles.title}>
        {t('home.shop.processTitle')}
      </h2>
      <ol className={styles.steps}>
        {STEPS.map((step, at) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.numeral} aria-hidden="true">
              {String(at + 1).padStart(2, '0')}
            </span>
            <h3 className={styles.stepTitle}>{t(step.title)}</h3>
            <p className={styles.stepBody}>{t(step.body)}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
