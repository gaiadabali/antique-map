/**
 * The shop's shell (the redesign of 2026-10-20), the same in either app: the skip link; a staff
 * member's draft-preview line (`PreviewBar`, TASKS.md 27.5.a); the owner's dated announcement
 * (`shop-header`, judged against the clock here, per request — TASKS.md 27.5.c); the shop's header
 * with its menu, search and bag; the page; the shop's footer; and the floating chat button
 * (`ChatLauncher`, docked — the panel's own JavaScript loads only once it is opened).
 *
 * Contact values are `site-settings`' public fields (`loadSiteSettings`); the menu, footer and logo
 * are `shop-header`'s and `shop-footer`'s (`loadShopNavigation`). The brand link and language
 * switcher are the shell's shared parts (`@engine/site/shell`), drawn the same on both sites.
 */
import { sisterOrigin, type SiteLocale } from '@engine/config/sites'
import type { ReactNode } from 'react'

import { ChatLauncher } from '@engine/chat/client/launcher'
import { ChatPageProvider } from '@engine/chat/client/page-context'
import { chatPanelText, suggestedStarts } from '@engine/chat/client/panel-text'
import {
  Announcement,
  BrandLink,
  chatContact,
  LocaleSwitcher,
  type ShellFrame,
} from '@engine/site/shell'
import { loadSiteSettings } from '@engine/site/site-settings'

import { loadShopNavigation } from '../server/shop/pages/navigation/load'
import { announcementLive } from '../server/shop/pages/navigation/resolve'
import { previewReader } from '../server/shop/pages/preview'
import { ContactStrip } from '../sites/shop/shell/contact-strip'
import { PreviewBar } from '../sites/shop/shell/preview-bar'
import { ShopFooter } from '../sites/shop/shell/shop-footer'
import { ShopHeaderSlot } from '../sites/shop/shell/shop-header-slot'
import { shopOrigin, type ShellText } from './site'

type Props = {
  readonly shell: ShellFrame
  readonly t: ShellText
  readonly children: ReactNode
}

export async function ShopShell({ shell, t, children }: Props) {
  const locale = shell.locale as SiteLocale
  const [settings, nav, reader] = await Promise.all([
    loadSiteSettings('shop', locale),
    loadShopNavigation(locale),
    previewReader(),
  ])
  // Judged now, per request, never inside a cache entry: a dated announcement starts and ends on time.
  const announcement = announcementLive(nav.announcement, new Date()) ? nav.announcement : null
  const chatText = chatPanelText(locale, 'shop')
  return (
    <ChatPageProvider>
      <a className="skip-link" href="#main">
        {t('shell.skipToContent')}
      </a>
      {reader !== null ? <PreviewBar locale={locale} /> : null}
      <Announcement text={announcement?.text ?? null} link={announcement?.link} t={t} />
      {/* The contact at the top of every page, in the menu and in the footer (TASKS.md 28.2). */}
      <ContactStrip contact={settings.contact} locale={locale} variant="bar" />
      <ShopHeaderSlot
        locale={shell.locale}
        homeHref={shell.homeHref}
        logo={<BrandLink shell={shell} t={t} src={nav.logo.light} />}
        locales={<LocaleSwitcher shell={shell} t={t} />}
        menu={nav.menu}
        contact={<ContactStrip contact={settings.contact} locale={locale} variant="menu" />}
        t={t}
      />
      <main id="main" className="site-main">
        {children}
      </main>
      <ShopFooter
        locale={shell.locale}
        logo={nav.logo.light ?? shell.logo}
        settings={settings}
        nav={nav}
        t={t}
      />
      <ChatLauncher
        label={t('shell.chat')}
        dock
        site="shop"
        locale={locale}
        origin={shopOrigin() ?? ''}
        // The chat's card to the gallery of originals links there (TASKS.md 23.4).
        sisterOrigin={sisterOrigin('shop') ?? ''}
        turnstileSiteKey={process.env.TURNSTILE_SITE_KEY?.trim() || null}
        text={chatText}
        suggestions={suggestedStarts(chatText, 'shop')}
        contact={chatContact(settings.contact)}
      />
    </ChatPageProvider>
  )
}
