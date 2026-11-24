/**
 * The owner's announcement, shown above the header on every page of a site that has one live (qa
 * 4.qa, finding F4): the gallery's from `site-settings.announcement`, the shop's from
 * `shop-header` while today is within its dates (TASKS.md 27.5.c), optionally a link. `null`
 * renders nothing.
 */
import styles from './announcement.module.css'
import type { ShellT } from './text'

type Props = {
  readonly text: string | null
  readonly link?: { readonly href: string; readonly external: boolean } | null
  readonly t: ShellT
}

export function Announcement({ text, link = null, t }: Props) {
  if (text === null) return null
  return (
    // A landmark of its own (`aside`), so its words are never outside every region.
    <aside className={styles.announcement} aria-label={t('shell.announcement')}>
      <p className={styles.announcementText}>
        {link === null ? (
          text
        ) : link.external ? (
          <a
            className={styles.announcementLink}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('shell.newTab', { label: text })}
          >
            {text}
          </a>
        ) : (
          <a className={styles.announcementLink} href={link.href}>
            {text}
          </a>
        )}
      </p>
    </aside>
  )
}
