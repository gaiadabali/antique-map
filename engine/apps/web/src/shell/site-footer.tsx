/** The footer: titled link columns, contact and hours from `site-settings`, the legal row and the sister bridge. */
import type { LocaleCode } from '@engine/config/constants'
import { siteOrigin, type SiteKey } from '@engine/config/sites'

import { Footer } from '../shared/ui'
import type { PublicSiteSettings } from '../server/site-settings'

import { ContactBlock } from './contact-block'
import type { NavItemSpec } from './primary-nav'
import { siteHref, type ShellText } from './site'
import styles from './shell.module.css'

type ShellPart = {
  readonly site: { key: SiteKey; name: string }
  readonly locale: LocaleCode
  readonly logo: string
}

/** The sister site's home on its own host: an absolute URL, or the path when no origin is known. */
function sisterHref(sister: SiteKey, locale: LocaleCode): string {
  const path = siteHref(sister)('home', {}, locale)
  const origin = siteOrigin(sister)
  return origin === null ? path : `${origin}${path}`
}

type Column = { readonly title: string; readonly links: readonly NavItemSpec[] }

function columnsOf(site: SiteKey, locale: LocaleCode, t: ShellText): readonly Column[] {
  const href = siteHref(site)
  const page = (slug: string) => href('page', { slug }, locale)
  if (site === 'gallery') {
    return [
      {
        title: t('footer.title.explore'),
        links: [
          { label: 'footer.collection', href: (l) => href('browse', {}, l) },
          { label: 'footer.makers', href: (l) => href('maker', {}, l) },
          { label: 'footer.places', href: (l) => href('place', {}, l) },
          { label: 'footer.stories', href: (l) => href('story', {}, l) },
        ],
      },
      {
        title: t('footer.title.about'),
        links: [
          { label: 'footer.sellToUs', href: (l) => href('sellToUs', {}, l) },
          { label: 'footer.about', href: () => page('about') },
          { label: 'footer.contact', href: (l) => href('contact', {}, l) },
        ],
      },
    ]
  }
  return [
    {
      title: t('footer.title.shop'),
      links: [
        { label: 'footer.shop', href: (l) => href('browse', {}, l) },
        { label: 'footer.collections', href: (l) => href('collection', {}, l) },
        { label: 'footer.stores', href: (l) => href('stores', {}, l) },
        { label: 'footer.partnership', href: (l) => href('partnership', {}, l) },
      ],
    },
    {
      title: t('footer.title.about'),
      links: [
        { label: 'footer.about', href: () => page('about') },
        { label: 'footer.delivery', href: () => page('delivery') },
        { label: 'footer.faq', href: () => page('faq') },
        { label: 'footer.contact', href: () => page('contact') },
      ],
    },
  ]
}

export function SiteFooter({
  shell,
  settings,
  t,
}: {
  shell: ShellPart
  settings: PublicSiteSettings
  t: ShellText
}) {
  const site = shell.site.key
  const locale = shell.locale
  const sister: SiteKey = site === 'gallery' ? 'shop' : 'gallery'
  const page = (slug: string) => siteHref(site)('page', { slug }, locale)
  return (
    <Footer
      logo={<img className="site-logo" src={shell.logo} alt="" />}
      nav={columnsOf(site, locale, t).map((column) => (
        <div className={styles.footerGroup} key={column.title}>
          <h2 className={styles.footerTitle}>{column.title}</h2>
          <ul className={styles.footerList}>
            {column.links.map((item) => (
              <li key={item.label}>
                <a className={styles.footerLink} href={item.href(locale)}>
                  {t(item.label)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      legal={
        <ul className={styles.legalList}>
          <li>
            <a className={styles.footerLink} href={page('privacy')}>
              {t('shell.privacy')}
            </a>
          </li>
          <li>
            <a className={styles.footerLink} href={page('terms')}>
              {t('shell.terms')}
            </a>
          </li>
          <li>
            {/* The two-way bridge: the other site lives on its own host, so the link is
                absolute — a root-relative path would land on this site's own home. */}
            <a className={styles.footerLink} href={sisterHref(sister, locale)}>
              {t('shell.sister')}
            </a>
          </li>
        </ul>
      }
      social={
        <div className={styles.footerGroup}>
          <h2 className={styles.footerTitle}>{t('shell.contact')}</h2>
          <div className={styles.footerContact}>
            <ContactBlock settings={settings} t={t} />
            {settings.hours && (
              <p className={styles.footerLine}>
                {t('shell.hours')}: {settings.hours}
              </p>
            )}
            {settings.replyPromise && <p className={styles.footerLine}>{settings.replyPromise}</p>}
          </div>
        </div>
      }
    />
  )
}
