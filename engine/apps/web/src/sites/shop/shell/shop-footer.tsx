/**
 * The shop's footer (the third handoff of 2026-10-20, `oei.css` §footer): a warm band in three
 * columns like the header — the stacked logo at the left; Explore (the header's four links, no
 * title, the current page's underlined) dead centre; Contact (a small-capitals title over
 * WhatsApp and the owner's social accounts from `site-settings` as 16 px icons in the header's
 * style, or the lexicon's placeholder while it answers none) flush right — the link and icon rows
 * on the logo's foot; then a white bar with Privacy and Terms at the left and, at the right, the
 * two-way bridge to the gallery of originals. Every word is the shell's lexicon.
 */
import type { LocaleCode } from '@engine/config/constants'
import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'
import { headers } from 'next/headers'

import type { PublicSiteSettings } from '../../../server/site-settings'
import { socialLinks } from '../../../shell/contact-block'
import { isCurrent, navItems } from '../../../shell/primary-nav'
import type { ShellText } from '../../../shell/site'
import { GALLERY_LIVE_LINK } from '../gallery-live'
import { FooterIcon, socialIcon, type FooterIconName } from './footer-icons'
import styles from './shop-footer.module.css'

type Props = {
  readonly locale: LocaleCode
  readonly logo: string
  readonly settings: PublicSiteSettings
  readonly t: ShellText
}

export async function ShopFooter({ locale, logo, settings, t }: Props) {
  const path = (await headers()).get(PROXY_REQUEST_HEADERS.publicPath)
  const contact = contactLinks(settings, t)
  return (
    <footer className={styles.footer}>
      <div className={styles.band}>
        <div className={styles.logo}>
          <img src={logo} alt="" />
        </div>
        <div className={styles.groups}>
          <nav className={styles.explore} aria-label={t('footer.title.explore')}>
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
          <nav className={styles.contact} aria-label={t('shell.contact')}>
            <h2 className={styles.title}>{t('shell.contact')}</h2>
            {contact.length === 0 ? (
              <p className={styles.line}>{t('shell.contactPlaceholder')}</p>
            ) : (
              <ul className={`${styles.links} ${styles.social}`}>
                {contact.map((link) => (
                  <li key={link.href}>
                    <a
                      className={styles.icon}
                      href={link.href}
                      target="_blank"
                      rel={link.rel}
                      aria-label={t('shell.newTab', { label: link.label })}
                    >
                      <FooterIcon name={link.icon} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </div>
      </div>
      <div className={styles.bar}>
        {/* Placeholders until the privacy and terms pages are written (then
            `siteHref('shop')('page', { slug }, locale)` again). */}
        <a href="#">{t('shell.privacy')}</a>
        <a href="#">{t('shell.terms')}</a>
        {/* The bridge to the originals: for now the owner's live gallery site, in a new tab, until
            the new gallery launches (then `sisterHref('gallery', locale)` again). */}
        <a
          className={styles.sister}
          {...GALLERY_LIVE_LINK}
          aria-label={t('shell.newTab', { label: t('shell.sister') })}
        >
          {t('shell.sister')}
        </a>
      </div>
    </footer>
  )
}

type ContactLink = {
  readonly href: string
  readonly label: string
  readonly icon: FooterIconName
  readonly rel: string
}

/**
 * WhatsApp, then the owner's social accounts: the handoff draws icons only, no email or phone. Each
 * opens in a new tab, so the shop stays open behind it.
 */
function contactLinks(settings: PublicSiteSettings, t: ShellText): readonly ContactLink[] {
  const { whatsapp } = settings.contact
  const links: ContactLink[] = []
  if (whatsapp) {
    links.push({
      href: `https://wa.me/${whatsapp.replace(/\D/g, '')}`,
      label: t('shell.whatsapp'),
      icon: 'whatsapp',
      rel: 'noopener noreferrer',
    })
  }
  for (const link of socialLinks(settings.social)) {
    links.push({
      href: link.url,
      label: link.platform,
      icon: socialIcon(link.platform),
      rel: 'me noopener noreferrer',
    })
  }
  return links
}
