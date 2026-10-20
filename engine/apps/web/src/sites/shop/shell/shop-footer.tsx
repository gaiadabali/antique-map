/**
 * The shop's footer (the handoff of 2026-10-20, `oei.css` §footer): a warm band with the stacked
 * logo at the left and two groups set flush right, under the header's icons — Explore (the
 * header's four links, the current page's underlined) and Contact (WhatsApp, email, phone and the
 * owner's social accounts from `site-settings`, or the lexicon's placeholder while it answers
 * none) — each a small-capitals title over one row of links; then a white bar with Privacy and
 * Terms at the left and, at the right, the two-way bridge to the gallery of originals. Every word
 * is the shell's lexicon.
 */
import type { LocaleCode } from '@engine/config/constants'
import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'
import { headers } from 'next/headers'

import type { PublicSiteSettings } from '../../../server/site-settings'
import { socialLinks } from '../../../shell/contact-block'
import { isCurrent, navItems } from '../../../shell/primary-nav'
import { sisterHref } from '../../../shell/site-footer'
import { siteHref, type ShellText } from '../../../shell/site'
import styles from './shop-footer.module.css'

type Props = {
  readonly locale: LocaleCode
  readonly logo: string
  readonly settings: PublicSiteSettings
  readonly t: ShellText
}

export async function ShopFooter({ locale, logo, settings, t }: Props) {
  const path = (await headers()).get(PROXY_REQUEST_HEADERS.publicPath)
  const page = (slug: string) => siteHref('shop')('page', { slug }, locale)
  const contact = contactLinks(settings, t)
  return (
    <footer className={styles.footer}>
      <div className={styles.band}>
        <div className={styles.logo}>
          <img src={logo} alt="" />
        </div>
        <div className={styles.groups}>
          <nav className={styles.group} aria-label={t('footer.title.explore')}>
            <h2 className={styles.title}>{t('footer.title.explore')}</h2>
            <ul className={styles.links}>
              {navItems('shop').map((item) => {
                const href = item.href(locale)
                return (
                  <li key={item.label}>
                    <a href={href} aria-current={isCurrent(path, href) ? 'page' : undefined}>
                      {t(item.label)}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className={styles.group}>
            <h2 className={styles.title}>{t('shell.contact')}</h2>
            {contact.length === 0 ? (
              <p className={styles.line}>{t('shell.contactPlaceholder')}</p>
            ) : (
              <ul className={styles.links}>
                {contact.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} rel={link.rel}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
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
