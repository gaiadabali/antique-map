import styles from './pagination.module.css'

export type PaginationProps = {
  readonly currentPage: number
  readonly totalPages: number
  readonly getHref: (page: number) => string
  readonly ariaLabel?: string
  readonly previousLabel?: string
  readonly nextLabel?: string
}

/** Numbered pagination using plain <a> (prefetching a storefront page costs a database read). */
export function Pagination({
  currentPage,
  totalPages,
  getHref,
  ariaLabel = 'Pagination',
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: PaginationProps): React.ReactElement {
  const pages = buildPages(currentPage, totalPages)

  const prevDisabled = currentPage <= 1
  const nextDisabled = currentPage >= totalPages

  return (
    <nav aria-label={ariaLabel} className={styles.nav}>
      <a
        href={prevDisabled ? getHref(currentPage) : getHref(currentPage - 1)}
        aria-disabled={prevDisabled}
        className={[styles.link, prevDisabled && styles.disabled].filter(Boolean).join(' ')}
      >
        {previousLabel}
      </a>

      <ol className={styles.list}>
        {pages.map((page, index) =>
          page === null ? (
            <li key={`ellipsis-${index}`}>
              <span className={styles.ellipsis} aria-hidden="true">
                …
              </span>
            </li>
          ) : (
            <li key={page}>
              <a
                href={getHref(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                className={[styles.link, page === currentPage && styles.current]
                  .filter(Boolean)
                  .join(' ')}
              >
                {page}
              </a>
            </li>
          ),
        )}
      </ol>

      <a
        href={nextDisabled ? getHref(currentPage) : getHref(currentPage + 1)}
        aria-disabled={nextDisabled}
        className={[styles.link, nextDisabled && styles.disabled].filter(Boolean).join(' ')}
      >
        {nextLabel}
      </a>
    </nav>
  )
}

function buildPages(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | null)[] = [1]

  if (current > 3) {
    pages.push(null)
  } else {
    pages.push(2, 3)
  }

  const middleStart = Math.max(2, current - 1)
  const middleEnd = Math.min(total - 1, current + 1)
  for (let page = middleStart; page <= middleEnd; page += 1) {
    if (!pages.includes(page)) {
      pages.push(page)
    }
  }

  if (current < total - 2) {
    if (!pages.includes(total - 1)) {
      pages.push(null)
    }
  } else {
    if (!pages.includes(total - 2)) pages.push(total - 2)
    if (!pages.includes(total - 1)) pages.push(total - 1)
  }

  pages.push(total)
  return dedupe(pages)
}

function dedupe(pages: (number | null)[]): (number | null)[] {
  const out: (number | null)[] = []
  let last: number | null = -1
  for (const page of pages) {
    if (page !== null && page === last) continue
    if (page === null && last === null) continue
    out.push(page)
    last = page
  }
  return out
}
