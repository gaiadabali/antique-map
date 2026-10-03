/**
 * The designed shell for both sites (the design team's drawings, phase 4.3.a): a header with the
 * logo, the site's primary navigation, the language switcher keeping the current path and the
 * chat entry point — inert until phase 8 wires the assistant; and a footer with contact, hours,
 * the sister-site bridge and the legal links. Built from the shared UI components and the
 * tokens (`shell.module.css`); every word comes from the site's lexicon.
 *
 * Contact values are read by `loadSiteSettings()` (`./site-settings`): the `site-settings` global
 * is owner-only, so that loader uses `overrideAccess: true` with an explicit `select` of only the
 * public contact fields. If it answers nothing, the footer shows the lexicon's placeholder text,
 * marked as such.
 */
import type { LocaleCode } from '@engine/config/constants'
import {
  SITES,
  parsePublicPath,
  siteOrigin,
  type SiteKey,
  type SiteLocale,
} from '@engine/config/sites'
import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'
import type { ReactNode } from 'react'
import { headers } from 'next/headers'

import { Button, Footer, Header, TextLink } from '../shared/ui'

import type { ShellMessageKey } from './messages'
import { siteHref, type ShellText } from './site'
import { loadSiteSettings, type PublicSiteSettings } from '../server/site-settings'
import styles from './shell.module.css'

/** What the footer knows of `site-settings`: the public contact fields only. */
type Settings = PublicSiteSettings

type ShellPart = {
  readonly site: { key: SiteKey; name: string }
  readonly locale: LocaleCode
  readonly homeHref: string
  readonly locales: readonly { locale: LocaleCode; href: string; current: boolean }[]
  readonly logo: string
}

type Props = {
  readonly shell: ShellPart
  readonly t: ShellText
  readonly children: ReactNode
}

export async function SiteShell({ shell, t, children }: Props) {
  const settings = await loadSiteSettings(shell.site.key, shell.locale as SiteLocale)
  return (
    <>
      <a className="skip-link" href="#main">
        {t('shell.skipToContent')}
      </a>
      <Header
        logo={<BrandLink shell={shell} t={t} />}
        nav={<PrimaryNav site={shell.site.key} locale={shell.locale} t={t} />}
        actions={
          <>
            <LocaleSwitcher shell={shell} t={t} />
            <Button variant="quiet" size="small" type="button" aria-disabled="true" tabIndex={-1}>
              {t('shell.chat')}
            </Button>
          </>
        }
      />
      <main id="main" className="site-main">
        {children}
      </main>
      <SiteFooter shell={shell} settings={settings} t={t} />
    </>
  )
}

/** The logo and name link home; the name is the image's text alternative, so the image is decorative. */
function BrandLink({ shell, t }: { shell: ShellPart; t: ShellText }) {
  return (
    <a
      className="site-brand"
      href={shell.homeHref}
      aria-label={t('shell.homeLink', { brand: shell.site.name })}
    >
      <img className="site-logo" src={shell.logo} alt="" />
      <span className="site-name">{shell.site.name}</span>
    </a>
  )
}

/** One header link: its surface, its params and the lexicon key of its label. */
type NavItemSpec = {
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

function PrimaryNav({ site, locale, t }: { site: SiteKey; locale: LocaleCode; t: ShellText }) {
  return (
    <nav className={styles.nav} aria-label={t('shell.menu')}>
      <ul className={styles.navList}>
        {navItems(site).map((item) => (
          <li key={item.label}>
            <TextLink href={item.href(locale)}>{t(item.label)}</TextLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * The language switcher keeps the visitor's page: the proxy hands the request its public path
 * (`x-public-path`), which `parsePublicPath()` reads back into a surface and params, so the other
 * locale's URL is `href()` of the same page. Anything the round-trip cannot name — a not-found, a
 * legacy address — falls back to the home in that locale, which `shellOf` already built.
 */
async function LocaleSwitcher({ shell, t }: { shell: ShellPart; t: ShellText }) {
  const current = shell.locales.find((each) => each.current)?.locale ?? shell.locale
  const hrefs = await Promise.all(
    shell.locales.map(async ({ locale, href: homeHref }) => ({
      locale,
      href:
        locale === current
          ? homeHref
          : await keptPathHref(shell.site.key, locale as SiteLocale, homeHref),
    })),
  )
  return (
    <nav className="site-locales" aria-label={t('shell.languages')}>
      <ul>
        {hrefs.map(({ locale, href }) => (
          <li key={locale}>
            <a
              href={href}
              hrefLang={locale}
              lang={locale}
              aria-current={locale === current ? 'true' : undefined}
            >
              {t(`shell.locale.${locale}` as ShellMessageKey)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** The current public path in `locale`, or `fallback` (the home) when the path names no page. */
async function keptPathHref(site: SiteKey, locale: SiteLocale, fallback: string): Promise<string> {
  const requestHeaders = await headers()
  const path = requestHeaders.get(PROXY_REQUEST_HEADERS.publicPath)
  if (path === null || path === '') return fallback
  const match = parsePublicPath(SITES[site], path)
  if (match.kind !== 'surface') return fallback
  try {
    return siteHref(site)(match.surface, match.params, locale)
  } catch {
    return fallback
  }
}

/** The sister site's home on its own host: an absolute URL, or the path when no origin is known. */
function sisterHref(sister: SiteKey, locale: LocaleCode): string {
  const path = siteHref(sister)('home', {}, locale)
  const origin = siteOrigin(sister)
  return origin === null ? path : `${origin}${path}`
}

/** The footer: the site's links, contact and hours from `site-settings`, the sister bridge. */
function SiteFooter({
  shell,
  settings,
  t,
}: {
  shell: ShellPart
  settings: Settings
  t: ShellText
}) {
  const { key: site, locale } = { key: shell.site.key, locale: shell.locale }
  const href = siteHref(site)
  const sister: SiteKey = site === 'gallery' ? 'shop' : 'gallery'
  const page = (slug: string) => href('page', { slug }, locale)
  const links: readonly NavItemSpec[] =
    site === 'gallery'
      ? [
          { label: 'footer.collection', href: (l) => href('browse', {}, l) },
          { label: 'footer.makers', href: (l) => href('maker', {}, l) },
          { label: 'footer.places', href: (l) => href('place', {}, l) },
          { label: 'footer.stories', href: (l) => href('story', {}, l) },
          { label: 'footer.sellToUs', href: (l) => href('sellToUs', {}, l) },
          { label: 'footer.about', href: () => page('about') },
          { label: 'footer.contact', href: () => page('contact') },
        ]
      : [
          { label: 'footer.shop', href: (l) => href('browse', {}, l) },
          { label: 'footer.collections', href: (l) => href('collection', {}, l) },
          { label: 'footer.stores', href: (l) => href('stores', {}, l) },
          { label: 'footer.partnership', href: (l) => href('partnership', {}, l) },
          { label: 'footer.delivery', href: () => page('delivery') },
          { label: 'footer.faq', href: () => page('faq') },
          { label: 'footer.about', href: () => page('about') },
          { label: 'footer.contact', href: () => page('contact') },
        ]
  return (
    <Footer
      logo={<img className="site-logo" src={shell.logo} alt="" />}
      nav={
        <ul className={styles.footerList}>
          {links.map((item) => (
            <li key={item.label}>
              <TextLink href={item.href(locale)}>{t(item.label)}</TextLink>
            </li>
          ))}
        </ul>
      }
      legal={
        <ul className={styles.footerList}>
          <li>
            <TextLink href={page('privacy')}>{t('shell.privacy')}</TextLink>
          </li>
          <li>
            <TextLink href={page('terms')}>{t('shell.terms')}</TextLink>
          </li>
          <li>
            {/* The two-way bridge: the other site lives on its own host, so the link is
                absolute — a root-relative path would land on this site's own home. */}
            <TextLink href={sisterHref(sister, locale)}>{t('shell.sister')}</TextLink>
          </li>
        </ul>
      }
      social={
        <div className={styles.footerContact}>
          <ContactBlock settings={settings} t={t} />
          {settings.hours && (
            <p className={styles.footerLine}>
              {t('shell.hours')}: {settings.hours}
            </p>
          )}
          {settings.replyPromise && <p className={styles.footerLine}>{settings.replyPromise}</p>}
        </div>
      }
    />
  )
}

/** WhatsApp, email and phone from `site-settings`; the lexicon's placeholder when it answers none. */
function ContactBlock({ settings, t }: { settings: Settings; t: ShellText }) {
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
