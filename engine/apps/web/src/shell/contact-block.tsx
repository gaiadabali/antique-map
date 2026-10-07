/**
 * The footer's contact lines (4.3.a), out of `site-shell.tsx` for the file-size limit: WhatsApp, email
 * and phone from `site-settings`, or the lexicon's placeholder when it answers none.
 */
import { TextLink } from '../shared/ui'
import type { PublicSiteSettings } from '../server/site-settings'

import type { ShellText } from './site'
import styles from './shell.module.css'

/** WhatsApp, email and phone from `site-settings`; the lexicon's placeholder when it answers none. */
export function ContactBlock({ settings, t }: { settings: PublicSiteSettings; t: ShellText }) {
  const items = [
    settings.contact.whatsapp && {
      key: 'whatsapp',
      href: `https://wa.me/${settings.contact.whatsapp.replace(/\D/g, '')}`,
      label: t('shell.whatsapp'),
    },
    settings.contact.email && {
      key: 'email',
      href: `mailto:${settings.contact.email}`,
      label: t('shell.email'),
    },
    settings.contact.phone && {
      key: 'phone',
      href: `tel:${settings.contact.phone}`,
      label: settings.contact.phone,
    },
  ].filter((item): item is { key: string; href: string; label: string } => Boolean(item))
  if (items.length === 0) {
    return <p className={styles.footerLine}>{t('shell.contactPlaceholder')}</p>
  }
  return (
    <ul className={styles.footerList}>
      {items.map((item) => (
        <li key={item.key}>
          <TextLink href={item.href}>{item.label}</TextLink>
        </li>
      ))}
    </ul>
  )
}
