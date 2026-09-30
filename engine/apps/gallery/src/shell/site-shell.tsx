/**
 * The storefront's frame (DESIGN-SYSTEM.md §2's shell, at placeholder fidelity until phase 22):
 * the brand's logo and name from config, the locale switcher, the page, the footer. Server-only
 * and script-free — every part is in the first flush, so it reads and works without JavaScript.
 * No design decision lives here: the look is the placeholder tokens (`../styles/tokens.css`).
 */
import type { LocaleCode } from '@engine/config/schema'
import type { Messages } from '@engine/i18n'
import type { ShellVM } from '@engine/view-models'
import type { ReactNode } from 'react'

import { brandHref } from './links'
import type { ShellMessageKey } from './messages'

type Props = {
  readonly shell: ShellVM
  readonly t: Messages<ShellMessageKey>['t']
  readonly children: ReactNode
}

export async function SiteShell({ shell, t, children }: Props) {
  const href = await brandHref()
  const localeName = (locale: LocaleCode) => t(`shell.locale.${locale}`)
  return (
    <>
      <a className="skip-link" href="#main">
        {t('shell.skipToContent')}
      </a>
      <header className="site-header">
        <a
          className="site-brand"
          href={href('home', {}, shell.locale)}
          aria-label={t('shell.homeLink', { brand: shell.brand.name })}
        >
          {/* The name beside it is the logo's text alternative, so the image is decorative. */}
          <img className="site-logo" src={shell.assets.logo} alt="" />
          <span className="site-name">{shell.brand.name}</span>
        </a>
        <nav className="site-locales" aria-label={t('shell.languages')}>
          <ul>
            {shell.locales.map((locale) => (
              <li key={locale}>
                <a
                  href={href('home', {}, locale)}
                  hrefLang={locale}
                  lang={locale}
                  aria-current={locale === shell.locale ? 'true' : undefined}
                >
                  {localeName(locale)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="site-main">
        {children}
      </main>
      <footer className="site-footer">
        <p>
          <span>{shell.brand.name}</span>
          {' · '}
          <span>{t('shell.contact')}</span>{' '}
          <a href={`mailto:${shell.contact.email}`}>{shell.contact.email}</a>
        </p>
      </footer>
    </>
  )
}
