/**
 * The shop's footer (the redesign of 2026-10-20, the handoff's Poster Club skeleton): a warm band
 * with the stacked logo at the left and three link columns — Shop, About, Contact — centred in the
 * rest, then a white bar with the legal links and, at its right, the two-way bridge to the gallery
 * of originals. Contact is `site-settings` (WhatsApp, email, phone, the owner's social accounts),
 * or the lexicon's placeholder while it answers none. Every word is the shell's lexicon.
 */
import type { LocaleCode } from '@engine/config/constants'

import type { PublicSiteSettings } from '../../../server/site-settings'
import { socialLinks } from '../../../shell/contact-block'
import { columnsOf, sisterHref } from '../../../shell/site-footer'
import { siteHref, type ShellText } from '../../../shell/site'
import styles from './shop-footer.module.css'

type Props = {
  readonly locale: LocaleCode
  readonly logo: string
  readonly settings: PublicSiteSettings
  readonly t: ShellText
}

export function ShopFooter({ locale, logo, settings, t }: Props) {
  const page = (slug: string) => siteHref('shop')('page', { slug }, locale)
  const contact = contactLinks(settings, t)
  return (
    <footer className={styles.footer}>
      <div className={styles.band}>
        <div className={styles.logo}>
          <img src={logo} alt="" />
        </div>
        <div className={styles.columns}>
          {columnsOf('shop', locale, t).map((column) => (
            <nav className={styles.column} key={column.title} aria-label={column.title}>
              <h2 className={styles.title}>{column.title}</h2>
              <ul>
                {column.links.map((item) => (
                  <li key={item.label}>
                    <a href={item.href(locale)}>{t(item.label)}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className={styles.column}>
            <h2 className={styles.title}>{t('shell.contact')}</h2>
            {contact.length === 0 ? (
              <p className={styles.line}>{t('shell.contactPlaceholder')}</p>
            ) : (
              <ul>
                {contact.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} rel={link.rel}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {settings.hours && (
              <p className={styles.line}>
                {t('shell.hours')}: {settings.hours}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className={styles.bar}>
        <a href={page('privacy')}>{t('shell.privacy')}</a>
        <a href={page('terms')}>{t('shell.terms')}</a>
        {/* The two-way bridge: the gallery lives on its own host, so the link is absolute. */}
        <a className={styles.sister} href={sisterHref('gallery', locale)}>
          {t('shell.sister')}
        </a>
      </div>
    </footer>
  )
}

type ContactLink = { readonly href: string; readonly label: string; readonly rel?: string }

function contactLinks(settings: PublicSiteSettings, t: ShellText): readonly ContactLink[] {
  const { whatsapp, email, phone } = settings.contact
  const links: ContactLink[] = []
  if (whatsapp) {
    links.push({ href: `https://wa.me/${whatsapp.replace(/\D/g, '')}`, label: t('shell.whatsapp') })
  }
  if (email) links.push({ href: `mailto:${email}`, label: t('shell.email') })
  if (phone) links.push({ href: `tel:${phone}`, label: phone })
  for (const link of socialLinks(settings.social)) {
    links.push({ href: link.url, label: link.platform, rel: 'me noopener noreferrer' })
  }
  return links
}
