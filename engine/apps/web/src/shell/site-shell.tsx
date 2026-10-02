/**
 * A site's frame, at placeholder fidelity until phase 4 builds the design team's shell: the site's
 * logo and name, the locale switcher, the page, the footer. Server-only and script-free — every
 * part is in the first flush, so it reads and works without JavaScript. No design decision lives
 * here: the look is the tokens (`../styles/tokens.css`, each site's palette under its
 * `data-site`), the words are the site's copy.
 */
import type { SiteShellVM } from '@engine/view-models'
import type { ReactNode } from 'react'

import type { ShellMessageKey } from './messages'
import type { ShellText } from './site'

type Props = {
  readonly shell: SiteShellVM
  readonly t: ShellText
  readonly children: ReactNode
}

export function SiteShell({ shell, t, children }: Props) {
  const name = shell.site.name
  return (
    <>
      <a className="skip-link" href="#main">
        {t('shell.skipToContent')}
      </a>
      <header className="site-header">
        <a
          className="site-brand"
          href={shell.homeHref}
          aria-label={t('shell.homeLink', { brand: name })}
        >
          {/* The name beside it is the logo's text alternative, so the image is decorative. */}
          <img className="site-logo" src={shell.logo} alt="" />
          <span className="site-name">{name}</span>
        </a>
        <nav className="site-locales" aria-label={t('shell.languages')}>
          <ul>
            {shell.locales.map(({ locale, href, current }) => (
              <li key={locale}>
                <a
                  href={href}
                  hrefLang={locale}
                  lang={locale}
                  aria-current={current ? 'true' : undefined}
                >
                  {t(`shell.locale.${locale}` as ShellMessageKey)}
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
        <p>{name}</p>
      </footer>
    </>
  )
}
