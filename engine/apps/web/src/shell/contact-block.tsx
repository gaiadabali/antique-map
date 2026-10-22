/**
 * The footer's contact lines (4.3.a), out of `site-shell.tsx` for the file-size limit: WhatsApp, email
 * and phone from `site-settings`, or the lexicon's placeholder when it answers none; then the site's
 * social accounts (`site-settings.social`, 10.6.e), each named by its platform as the owner typed it.
 */
import type { PublicSiteSettings } from '../server/site-settings'

import type { ShellText } from './site'
import styles from './shell.module.css'

/** Only an `https:` address becomes a link: the field is free text, so no `javascript:` or `//host`. */
export function socialLinks(
  social: PublicSiteSettings['social'],
): readonly { platform: string; url: string }[] {
  return (social ?? []).filter(
    (link) => link.platform.trim() !== '' && /^https:\/\/[^/\s]+\.[^/\s]+/i.test(link.url),
  )
}

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
  const social = socialLinks(settings.social)
  return (
    <>
      {items.length === 0 ? (
        <p className={styles.footerLine}>{t('shell.contactPlaceholder')}</p>
      ) : (
        <ul className={styles.footerList}>
          {items.map((item) => (
            <li key={item.key}>
              <a className={styles.footerLink} href={item.href}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      {social.length > 0 && (
        <ul className={styles.footerList}>
          {social.map((link) => (
            <li key={link.url}>
              <a className={styles.footerLink} href={link.url} rel="me noopener noreferrer">
                {link.platform}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
