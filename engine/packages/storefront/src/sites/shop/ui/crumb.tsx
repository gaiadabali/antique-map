/**
 * The shop's breadcrumb (the handoff's Poster Club listing head): a small house for the home, then
 * each step in 12 px muted type, the last the current page. Every word arrives as a prop.
 */
import styles from './crumb.module.css'

type Step = { readonly label: string; readonly href?: string }

type Props = {
  readonly homeHref: string
  readonly homeLabel: string
  readonly label: string
  readonly steps: readonly Step[]
}

export function Crumb({ homeHref, homeLabel, label, steps }: Props) {
  return (
    <nav className={styles.crumb} aria-label={label}>
      <ol>
        <li>
          <a href={homeHref} aria-label={homeLabel} className={styles.home}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M3 11 12 4l9 7v9H3z" strokeLinejoin="round" />
            </svg>
          </a>
        </li>
        {steps.map((step, at) => {
          const last = at === steps.length - 1
          return (
            <li key={`${step.label}-${at}`}>
              <span className={styles.separator} aria-hidden="true">
                ›
              </span>
              {last || step.href === undefined ? (
                <span aria-current={last ? 'page' : undefined}>{step.label}</span>
              ) : (
                <a href={step.href}>{step.label}</a>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
