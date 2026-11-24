/**
 * The shell's two parts every site's header carries, the same markup on both (the page frame's
 * `.site-brand` and `.site-locales`, `../site.css`): the logo linking home, and the language
 * switcher keeping the visitor's page (PLAN-V2 §4.2: the shared header pieces live once).
 *
 * The switcher reads the public path the proxy hands the request (`x-public-path`), which
 * `parsePublicPath()` reads back into a surface and params, so the other locale's URL is `href()`
 * of the same page. Anything the round-trip cannot name — a not-found, a legacy address — falls
 * back to the home in that locale.
 */
import type { LocaleCode } from '@engine/config/constants'
import {
  createHref,
  parsePublicPath,
  SITES,
  type Href,
  type SiteKey,
  type SiteLocale,
} from '@engine/config/sites'
import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'
import type { ShellMessageKey } from '@engine/i18n/shell'
import { headers } from 'next/headers'

import type { ShellT } from './text'

/** What the shell knows of its site and locale: the parts these two draw from. */
export type ShellFrame = {
  readonly site: { readonly key: SiteKey; readonly name: string }
  readonly locale: LocaleCode
  readonly homeHref: string
  readonly locales: readonly { locale: LocaleCode; href: string; current: boolean }[]
  readonly logo: string
}

/**
 * The logo links home. The logo already carries the site's name, so no wordmark is set beside it
 * (the user, 2026-10-11); the link's own label names it, so the image is decorative.
 */
export function BrandLink({
  shell,
  t,
  src,
}: {
  shell: ShellFrame
  t: ShellT
  src?: string | null
}) {
  return (
    <a
      className="site-brand"
      href={shell.homeHref}
      aria-label={t('shell.homeLink', { brand: shell.site.name })}
    >
      <img className="site-logo" src={src ?? shell.logo} alt="" />
      {/* The name is in the header for every reader and tool, but not drawn twice beside the logo. */}
      <span className="site-name">{shell.site.name}</span>
    </a>
  )
}

export async function LocaleSwitcher({ shell, t }: { shell: ShellFrame; t: ShellT }) {
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

const hrefs = new Map<SiteKey, Href>()
function hrefOf(site: SiteKey): Href {
  let href = hrefs.get(site)
  if (!href) {
    href = createHref(SITES[site])
    hrefs.set(site, href)
  }
  return href
}

/** The current public path in `locale`, or `fallback` (the home) when the path names no page. */
async function keptPathHref(site: SiteKey, locale: SiteLocale, fallback: string): Promise<string> {
  const path = (await headers()).get(PROXY_REQUEST_HEADERS.publicPath)
  if (path === null || path === '') return fallback
  const match = parsePublicPath(SITES[site], path)
  if (match.kind !== 'surface') return fallback
  try {
    return hrefOf(site)(match.surface, match.params, locale)
  } catch {
    return fallback
  }
}
