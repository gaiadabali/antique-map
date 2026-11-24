/**
 * The gallery's designed shell (the design team's drawings, phase 4.3.a): a header with the
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
 *
 * The shop draws its own shell (`ShopShell`, `@engine/storefront/shell`): its menu, footer, logo and
 * dated announcement are `shop-header`'s and `shop-footer`'s (TASKS.md 27.5.c), and the brand link
 * and language switcher are the shared ones (`@engine/site/shell`), as here. Each root layout hands
 * `SiteRoot` its own site's shell, so neither site's scripts carry the other's header and menu
 * (the home's JS budget, DESIGN-SYSTEM.md).
 */
import type { LocaleCode } from '@engine/config/constants'
import { siteOrigin, type SiteKey, type SiteLocale } from '@engine/config/sites'
import type { ReactNode } from 'react'

import { Header } from '@engine/ui/header'
import { ChatLauncher } from '@engine/chat/client/launcher'
import { ChatPageProvider } from '@engine/chat/client/page-context'
import { chatPanelText, suggestedStarts } from '@engine/chat/client/panel-text'
import { Announcement, BrandLink, chatContact, LocaleSwitcher } from '@engine/site/shell'

import { PrimaryNav } from './primary-nav'
import { SiteFooter } from './site-footer'
import type { ShellText } from './site'
import { loadSiteSettings } from '../server/site-settings'

type ShellPart = {
  readonly site: { key: SiteKey; name: string }
  readonly locale: LocaleCode
  readonly homeHref: string
  readonly locales: readonly { locale: LocaleCode; href: string; current: boolean }[]
  readonly logo: string
  readonly logoOnDark: string
}

export type SiteShellProps = {
  readonly shell: ShellPart
  readonly t: ShellText
  readonly children: ReactNode
}

export async function SiteShell({ shell, t, children }: SiteShellProps) {
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
        dock={false}
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
