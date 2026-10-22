import type { ReactNode } from 'react'

import styles from './breadcrumbs.module.css'

export type Breadcrumb = {
  readonly label: string
  readonly href?: string
}

export type BreadcrumbsProps = {
  readonly items: readonly Breadcrumb[]
  readonly ariaLabel?: string
  readonly separator?: ReactNode
}

/** Horizontal breadcrumbs: every item but the last is a link; the last is current page. */
export function Breadcrumbs({
  items,
  ariaLabel = 'Breadcrumb',
  separator = '/',
}: BreadcrumbsProps): React.ReactElement {
  return (
    <nav aria-label={ariaLabel} className={styles.nav}>
      <ol className={styles.list}>
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={index} className={styles.item}>
              {last || !item.href ? (
                <span aria-current={last ? 'page' : undefined} className={styles.current}>
                  {item.label}
                </span>
              ) : (
                <a href={item.href} className={styles.link}>
                  {item.label}
                </a>
              )}
              {!last && (
                <span className={styles.separator} aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
