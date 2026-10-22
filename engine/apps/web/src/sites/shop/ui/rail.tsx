/**
 * A rail of cards (the handoff's Poster Club carousel): the section's title at the left, two small
 * arrows at the right on a desktop, four cards in view that snap card by card, and a link centred
 * under them. On a phone the cards are narrower, the next one peeks and a swipe moves the rail; the
 * arrows step it by one card. A Server Component with no client code of its own: the arrows carry
 * data attributes and the header's one delegated listener (`./rail-steps`) does the scrolling.
 * Every word arrives as a prop.
 */
import { Children, type ReactNode } from 'react'

import styles from './rail.module.css'
import { RAIL_FOR_ATTRIBUTE, RAIL_STEP_ATTRIBUTE } from './rail-attributes'

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
  const listId = `${id}-list`
  const arrow = (direction: '-1' | '1', label: string, path: string) => (
    <button
      type="button"
      aria-label={label}
      {...{ [RAIL_STEP_ATTRIBUTE]: direction, [RAIL_FOR_ATTRIBUTE]: listId }}
    >
      <svg
        viewBox="0 0 8 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d={path} />
      </svg>
    </button>
  )
  return (
    <section className={styles.section} data-flush={flush || undefined} aria-labelledby={id}>
      <div className={styles.head}>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        <div className={styles.arrows}>
          {arrow('-1', previousLabel, 'M7 1 1 7l6 6')}
          {arrow('1', nextLabel, 'm1 1 6 6-6 6')}
        </div>
      </div>
      <ul id={listId} className={styles.rail}>
        {Children.map(children, (child) => (child ? <li>{child}</li> : null))}
      </ul>
      {more ? <div className={styles.more}>{more}</div> : null}
    </section>
  )
}
