/**
 * The header's links: quiet text that underlines on hover and on the current page (a link's
 * `aria-current`), never permanently. The current page comes from the path the proxy hands the
 * request (`x-public-path`), the same one the language switcher keeps.
 */
import type { LocaleCode } from '@engine/config/constants'
import type { SiteKey } from '@engine/config/sites'
import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'
import { headers } from 'next/headers'

import type { ShellMessageKey } from './messages'
import { siteHref, type ShellText } from './site'
import styles from './shell.module.css'

/** One link: its surface, its params and the lexicon key of its label. */
export type NavItemSpec = {
  readonly label: ShellMessageKey
  readonly href: (locale: LocaleCode) => string
}

/** The site's header links, from the drawing, each a real surface of that site. */
function navItems(site: SiteKey): readonly NavItemSpec[] {
  const href = siteHref(site)
  return site === 'gallery'
    ? [
        { label: 'nav.collection', href: (l) => href('browse', {}, l) },
        { label: 'nav.makers', href: (l) => href('maker', {}, l) },
        { label: 'nav.places', href: (l) => href('place', {}, l) },
        { label: 'nav.stories', href: (l) => href('story', {}, l) },
        { label: 'nav.sellToUs', href: (l) => href('sellToUs', {}, l) },
      ]
    : [
        { label: 'nav.shop', href: (l) => href('browse', {}, l) },
        { label: 'nav.collections', href: (l) => href('collection', {}, l) },
        { label: 'nav.stores', href: (l) => href('stores', {}, l) },
        { label: 'nav.partnership', href: (l) => href('partnership', {}, l) },
      ]
}

/** True when `path` is the link's page or one beneath it. */
function isCurrent(path: string | null, target: string): boolean {
  if (path === null) return false
  const here = path.split(/[?#]/)[0]?.replace(/\/+$/, '') ?? ''
  const there = target.replace(/\/+$/, '')
  return here === there || here.startsWith(`${there}/`)
}

export async function PrimaryNav({
  site,
  locale,
  t,
}: {
  site: SiteKey
  locale: LocaleCode
  t: ShellText
}) {
  const path = (await headers()).get(PROXY_REQUEST_HEADERS.publicPath)
  return (
    <nav className={styles.nav} aria-label={t('shell.menu')}>
      <ul className={styles.navList}>
        {navItems(site).map((item) => {
          const href = item.href(locale)
          return (
            <li key={item.label}>
              <a
                className={styles.navLink}
                href={href}
                aria-current={isCurrent(path, href) ? 'page' : undefined}
              >
                {t(item.label)}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
