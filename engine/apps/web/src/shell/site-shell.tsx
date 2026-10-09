/**
 * The designed shell for both sites (the design team's drawings, phase 4.3.a): a header with the
 * logo, the site's primary navigation and the language switcher keeping the current path; the
 * floating chat button (`ChatLauncher`, 8.2 — the panel's own JavaScript loads only once it is
 * opened); and a footer with contact, hours, the sister-site bridge and the legal links. Built
 * from the shared UI components and the tokens (`shell.module.css`); every word comes from the
 * site's lexicon, except the chat panel's own words, resolved by `chatPanelText()` (8.2).
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

import { Header } from '../shared/ui'
import { ChatLauncher } from '../shared/chat/chat-launcher'
import { ChatPageProvider } from '../shared/chat/chat-page-context'
import { chatPanelText, suggestedStarts } from '../shared/chat/lexicon'

import { Announcement } from './announcement'
import { chatContact } from './chat-contact'
import { PrimaryNav } from './primary-nav'
import { SiteFooter } from './site-footer'
import type { ShellMessageKey } from './messages'
import { siteHref, type ShellText } from './site'
import { loadSiteSettings } from '../server/site-settings'

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
  const locale = shell.locale as SiteLocale
  const settings = await loadSiteSettings(shell.site.key, locale)
  const chatText = chatPanelText(locale, shell.site.key)
  return (
    <ChatPageProvider>
      <a className="skip-link" href="#main">
        {t('shell.skipToContent')}
      </a>
      <Announcement text={settings.announcement} t={t} />
      <Header
        logo={<BrandLink shell={shell} t={t} />}
        nav={<PrimaryNav site={shell.site.key} locale={shell.locale} t={t} />}
        openLabel={t('shell.menu.open')}
        closeLabel={t('shell.menu.close')}
        menuLabel={t('shell.menu')}
        actions={<LocaleSwitcher shell={shell} t={t} />}
      />
      <main id="main" className="site-main">
        {children}
      </main>
      <SiteFooter shell={shell} settings={settings} t={t} />
      <ChatLauncher
        label={t('shell.chat')}
        site={shell.site.key}
        locale={locale}
        origin={siteOrigin(shell.site.key) ?? ''}
        turnstileSiteKey={process.env.TURNSTILE_SITE_KEY?.trim() || null}
        text={chatText}
        suggestions={suggestedStarts(chatText, shell.site.key)}
        contact={chatContact(settings.contact)}
      />
    </ChatPageProvider>
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
