/**
 * A rail's place while its read streams: the title, four empty wells and their caption lines, so
 * nothing below moves when the cards arrive. Hidden from assistive technology.
 */
import { PrintTile, Skeleton } from '../../../shared/ui'
import styles from './rail.module.css'

export function RailSkeleton({
  title,
  flush,
}: {
  readonly title: string
  readonly flush?: boolean
}) {
  return (
    <div className={styles.section} data-flush={flush || undefined} aria-hidden="true">
      <div className={styles.head}>
        <p className={styles.title}>{title}</p>
      </div>
      <ul className={styles.rail}>
        {[0, 1, 2, 3].map((at) => (
          <li key={at}>
            <PrintTile>
              <span />
            </PrintTile>
            <Skeleton width="60%" height="1rem" />
          </li>
        ))}
      </ul>
    </div>
  )
}
