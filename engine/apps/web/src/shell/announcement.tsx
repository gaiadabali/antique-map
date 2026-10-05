/** The owner's announcement (`site-settings.announcement`), shown above the header on every page
 * of a site that has one set (qa 4.qa, finding F4). `null` renders nothing. */
import styles from './shell.module.css'
import type { ShellText } from './site'

export function Announcement({ text, t }: { text: string | null; t: ShellText }) {
  if (text === null) return null
  return (
    <div className={styles.announcement} role="note" aria-label={t('shell.announcement')}>
      <p className={styles.announcementText}>{text}</p>
    </div>
  )
}
