/**
 * The search page's opening (Outline Colour 17.3): a verdigris wash holding the page title, the
 * answer's lede (the count, the sold toggle, the suggestion) and the search form under it.
 */
import { Band, SectionHead } from '../../../shared/ui'
import styles from './search.module.css'

export function SearchHead({
  title,
  lede,
  children,
}: {
  readonly title: string
  readonly lede?: React.ReactNode
  /** The search form. */
  readonly children?: React.ReactNode
}): React.ReactElement {
  return (
    <Band pigment={1} strength="wash" as="div" pad={false} className={styles.band}>
      <SectionHead level={1} className={styles.head} title={title} lede={lede} />
      {children}
    </Band>
  )
}
