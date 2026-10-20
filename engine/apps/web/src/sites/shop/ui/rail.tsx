'use client'

/**
 * A rail of cards (the handoff's Poster Club carousel): the section's title at the left, two small
 * arrows at the right on a desktop, four cards in view that snap card by card, and a link centred
 * under them. On a phone the cards are narrower, the next one peeks and a swipe moves the rail; the
 * arrows step it by one card. Every word arrives as a prop.
 */
import { Children, useRef, type ReactNode } from 'react'

import styles from './rail.module.css'

type Props = {
  readonly id: string
  readonly title: string
  readonly previousLabel: string
  readonly nextLabel: string
  readonly children: ReactNode
  /** The link under the rail (a `CapsLink`). */
  readonly more?: ReactNode
  /** No top padding: the rail follows another without a second gap. */
  readonly flush?: boolean
}

export function Rail({ id, title, previousLabel, nextLabel, children, more, flush }: Props) {
  const list = useRef<HTMLUListElement>(null)
  const step = (direction: -1 | 1) => {
    const rail = list.current
    const first = rail?.firstElementChild as HTMLElement | null
    if (!rail || !first) return
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0
    rail.scrollBy({ left: direction * (first.offsetWidth + gap), behavior: 'smooth' })
  }
  return (
    <section className={styles.section} data-flush={flush || undefined} aria-labelledby={id}>
      <div className={styles.head}>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        <div className={styles.arrows}>
          <button type="button" aria-label={previousLabel} onClick={() => step(-1)}>
            <svg
              viewBox="0 0 8 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M7 1 1 7l6 6" />
            </svg>
          </button>
          <button type="button" aria-label={nextLabel} onClick={() => step(1)}>
            <svg
              viewBox="0 0 8 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m1 1 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
      <ul ref={list} className={styles.rail}>
        {Children.map(children, (child) => (child ? <li>{child}</li> : null))}
      </ul>
      {more ? <div className={styles.more}>{more}</div> : null}
    </section>
  )
}
