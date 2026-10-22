/**
 * Numbered steps (the shop home's "how a print is made", the redesign of 2026-10-20, the handoff's
 * Poster Club USP band): a full-bleed warm band, the title centred above the steps in columns,
 * each opened by its numeral in the logo's umber. The words are the page's `steps` block.
 */
import type { StepsVM } from '../../../server/shop/pages/blocks'
import styles from './process.module.css'

export function Process({ block }: { readonly block: StepsVM }) {
  const titleId = `steps-${block.id}`
  return (
    <section id={block.anchor ?? undefined} className={styles.band} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        {block.title}
      </h2>
      <ol className={styles.steps}>
        {block.steps.map((step, at) => (
          <li key={`${at}-${step.title}`} className={styles.step}>
            <span className={styles.numeral} aria-hidden="true">
              {String(at + 1).padStart(2, '0')}
            </span>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            {step.body ? <p className={styles.stepBody}>{step.body}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
