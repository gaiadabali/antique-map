import styles from './status-timeline.module.css'

export type TimelineStep = {
  readonly key: string
  readonly label: string
  readonly at?: string
}

export type StatusTimelineProps = {
  readonly steps: readonly TimelineStep[]
  readonly current: string
  readonly ariaLabel?: string
}

/** Ordered status steps with done/current/upcoming visual states. */
export function StatusTimeline({
  steps,
  current,
  ariaLabel = 'Status',
}: StatusTimelineProps): React.ReactElement {
  const currentIndex = steps.findIndex((step) => step.key === current)

  return (
    <ol aria-label={ariaLabel} className={styles.list}>
      {steps.map((step, index) => {
        const state =
          index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming'
        return (
          <li
            key={step.key}
            aria-current={state === 'current' ? 'step' : undefined}
            className={[styles.item, styles[state]].filter(Boolean).join(' ')}
          >
            <span className={styles.marker} />
            <span className={styles.body}>
              <span className={styles.label}>{step.label}</span>
              {step.at && (
                <time className={styles.time} dateTime={step.at}>
                  {step.at}
                </time>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
