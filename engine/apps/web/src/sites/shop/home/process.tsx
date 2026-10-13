/**
 * How a print is made, on the shop home: the section's title stands alone at the left of a desktop
 * (and above the steps on a phone), the three steps run beside it as a ruled list. The order is
 * carried by the list and the layout, not by numerals. The pale tile ground gives the page its
 * rhythm against the white sections around it. Every word comes from the lexicon.
 */
import { Band, SectionHead } from '../../../shared/ui'

import type { HomeText } from './home-messages'
import styles from './process.module.css'

const STEPS = [
  { title: 'home.shop.processStep1Title', body: 'home.shop.processStep1Body' },
  { title: 'home.shop.processStep2Title', body: 'home.shop.processStep2Body' },
  { title: 'home.shop.processStep3Title', body: 'home.shop.processStep3Body' },
] as const

export function Process({ t }: { t: HomeText }) {
  return (
    <Band
      id="process"
      pigment={1}
      strength="tint"
      pad={false}
      className={styles.process}
      aria-labelledby="home-process"
    >
      <div className={styles.layout}>
        <SectionHead
          id="home-process"
          className={styles.lead}
          title={t('home.shop.processTitle')}
        />
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step.title} className={styles.step}>
              <h3 className={styles.stepTitle}>{t(step.title)}</h3>
              <p className={styles.stepBody}>{t(step.body)}</p>
            </li>
          ))}
        </ol>
      </div>
    </Band>
  )
}
