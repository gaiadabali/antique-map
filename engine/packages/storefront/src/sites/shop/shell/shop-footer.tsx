/**
 * The shop's footer (the third handoff of 2026-10-20, `oei.css` §footer; TASKS.md 27.5.c): a warm
 * band in three columns like the header — the logo at the left; at the centre the owner's footer
 * columns from `shop-footer` (a small-capitals title over its links), or, while there are none,
 * the header's links untitled; Contact flush right (the owner's social accounts from
 * `site-settings` as 16 px icons with WhatsApp's after them, then the phone, email and address —
 * the bar at the top and the menu keep WhatsApp's number in words, TASKS.md 28.2 — and the hours,
 * or the lexicon's placeholder while it answers none) — then a white bar with the legal links (CMS
 * pages), the line at the
 * bottom and the bridge to the gallery of originals. A link to anything unpublished is already
 * dropped (`server/shop/pages/navigation`); every other word is the shell's lexicon.
 */
import type { LocaleCode } from '@engine/config/constants'
import type { SiteLocale } from '@engine/config/sites'
import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'
import { headers } from 'next/headers'

import type { NavLink, ShopNavigationVM } from '../../../server/shop/pages/navigation/load'
import type { PublicSiteSettings } from '@engine/site/site-settings'
import { isCurrent, navItems } from '../../../shell/primary-nav'
import type { ShellText } from '../../../shell/site'
import { GALLERY_LIVE_LINK } from '../gallery-live'
import { ContactIcons, contactIconLinks } from './contact-icons'
import { contactLinesOf } from './contact-strip'
import { shopShellText } from './shell-messages'
import styles from './shop-footer.module.css'

type Props = {
  readonly locale: LocaleCode
  readonly logo: string
  readonly settings: PublicSiteSettings
  readonly nav: ShopNavigationVM
  readonly t: ShellText
}

export async function ShopFooter({ locale, logo, settings, nav, t }: Props) {
  const path = (await headers()).get(PROXY_REQUEST_HEADERS.publicPath)
  const words = shopShellText(locale as SiteLocale)
  const all = contactLines(settings, t, locale as SiteLocale)
  // WhatsApp is an icon after the social accounts; the other lines stay words.
  const icons = contactIconLinks(
    settings.social,
    all.find((line) => line.key === 'whatsapp'),
  )
  const lines = all.filter((line) => line.key !== 'whatsapp')
  // The header's links stand in for columns the owner has not made yet.
  const explore: readonly NavLink[] =
    nav.menu.length > 0
      ? nav.menu
      : navItems('shop').map((item) => ({
          label: t(item.label),
          href: item.href(locale),
          external: false,
        }))
  const link = (item: NavLink) => (
    <a
      href={item.href}
      aria-current={!item.external && isCurrent(path, item.href) ? 'page' : undefined}
      {...(item.external
        ? {
            target: '_blank',
            rel: 'noopener noreferrer',
            'aria-label': t('shell.newTab', { label: item.label }),
          }
        : {})}
    >
      {item.label}
    </a>
  )
  return (
    <footer className={styles.footer}>
      <div className={styles.band}>
        <div className={styles.logo}>
          <img src={logo} alt="" />
        </div>
        <div className={styles.groups}>
          {nav.columns.length > 0 ? (
            <div className={styles.columns}>
              {nav.columns.map((column) => (
                <nav key={column.title} className={styles.column} aria-label={column.title}>
                  <h2 className={styles.title}>{column.title}</h2>
                  <ul className={`${styles.links} ${styles.stack}`}>
                    {column.links.map((item) => (
                      <li key={`${item.href}-${item.label}`}>{link(item)}</li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          ) : (
            <nav className={styles.explore} aria-label={t('footer.title.explore')}>
              <ul className={styles.links}>
                {explore.map((item) => (
                  <li key={`${item.href}-${item.label}`}>{link(item)}</li>
                ))}
              </ul>
            </nav>
          )}
          <div className={styles.contact}>
            <h2 className={styles.title}>{t('shell.contact')}</h2>
            {icons.length === 0 && lines.length === 0 ? (
              <p className={styles.line}>{t('shell.contactPlaceholder')}</p>
            ) : null}
            <ContactIcons
              links={icons}
              newTab={(label) => t('shell.newTab', { label })}
              className={`${styles.links} ${styles.social}`}
              linkClassName={styles.icon}
            />
            {lines.length > 0 ? (
              <ul className={styles.lines}>
                {lines.map((line) => (
                  <li key={line.key}>
                    {line.href ? (
                      <a
                        href={line.href}
                        aria-label={line.label}
                        {...(line.away ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        {line.text}
                      </a>
                    ) : (
                      line.text
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
      <div className={styles.bar}>
        {nav.legal.length > 0 ? (
          <ul className={styles.legal}>
            {nav.legal.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        ) : null}
        <p className={styles.copyright}>
          {nav.copyright ??
            words('shell.shop.copyright', { year: String(new Date().getFullYear()) })}
        </p>
        {/* The bridge to the originals: for now the owner's live gallery site, in a new tab, until
            the new gallery launches (then `sisterHref('gallery', locale)` again). */}
        <a
          className={styles.sister}
          {...GALLERY_LIVE_LINK}
          aria-label={t('shell.newTab', { label: nav.galleryLinkLabel ?? t('shell.sister') })}
        >
          {nav.galleryLinkLabel ?? t('shell.sister')}
        </a>
      </div>
    </footer>
  )
}

type ContactLine = {
  readonly key: string
  readonly text: string
  readonly href?: string
  readonly label?: string
  readonly away?: boolean
}

/** The shop's phone, WhatsApp, email and hours from the settings, under the icons. */
function contactLines(
  settings: PublicSiteSettings,
  t: ShellText,
  locale: SiteLocale,
): readonly ContactLine[] {
  const lines: ContactLine[] = [...contactLinesOf(settings.contact, locale)]
  if (settings.hours) lines.push({ key: 'hours', text: `${t('shell.hours')}: ${settings.hours}` })
  return lines
}
