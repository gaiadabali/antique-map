/**
 * What each site's root layout renders and its metadata (`app/(<site>)/<site>/[locale]/layout.tsx`
 * passes its own site): `<html>` in the page's locale, the site's palette by `data-site`, and the
 * shell. The site and its origin are read at request time, after `connection()` (`./site`), so
 * nothing under a root layout prerenders at `next build`: a prerendered shell would bake one
 * environment's origin into every environment's HTML, and serve its build-time status.
 *
 * Absolute URLs — `metadataBase`, the canonical and alternates, Open Graph's image — are built on
 * the site's canonical origin from the host allow-list (`siteOrigin()`), never on the request's
 * `Host`. Icons and the web manifest are linked at their root URLs, which the proxy answers from the
 * site's own files; never Next's file conventions (`app/icon.*`, `app/manifest.ts`), which one
 * build would make for both sites.
 */
import type { SiteKey } from '@engine/config/sites'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { SITE_ASSETS } from '@engine/http/manifest'

import { fontVariables } from '../shared/styles/fonts'

import { siteLocale } from './messages'
import { currentSite, shellOf, shellText, siteAsset, siteHref, type CurrentSite } from './site'
import { SiteShell } from './site-shell'

type LocaleParams = Promise<{ locale: string }>

export async function siteMetadata(key: SiteKey, params: LocaleParams): Promise<Metadata> {
  const site = await currentSite(key)
  const locale = siteLocale(key, (await params).locale)
  if (locale === null) return {}
  return {
    title: { default: site.name, template: `%s · ${site.name}` },
    ...(site.origin === null ? {} : { metadataBase: new URL(site.origin) }),
    icons: { icon: `/${SITE_ASSETS.favicon}`, apple: `/${SITE_ASSETS.touchIcon}` },
    manifest: `/${SITE_ASSETS.manifest}`,
    openGraph: openGraphOf(site, locale),
  }
}

/**
 * The site's Open Graph floor. A page that sets `openGraph` replaces its layout's whole object
 * (Next merges metadata one key deep), so a page builds on this rather than writing its own.
 */
function openGraphOf(site: CurrentSite, locale: string): NonNullable<Metadata['openGraph']> {
  return {
    siteName: site.name,
    locale,
    images: [{ url: siteAsset(site.key, SITE_ASSETS.ogImage) }],
  }
}

/** A home page's canonical and its alternates, one per locale, `x-default` English. */
export async function homeMetadata(key: SiteKey, params: LocaleParams): Promise<Metadata> {
  const site = await currentSite(key)
  const locale = siteLocale(key, (await params).locale)
  if (locale === null) return {}
  const href = siteHref(key)
  const languages = Object.fromEntries(
    site.locales.supported.map((each) => [each, href('home', {}, each)]),
  )
  return {
    alternates: {
      canonical: href('home', {}, locale),
      languages: { ...languages, 'x-default': href('home', {}, site.locales.default) },
    },
    openGraph: { ...openGraphOf(site, locale), url: href('home', {}, locale) },
  }
}

export async function SiteRoot(props: {
  readonly site: SiteKey
  readonly params: LocaleParams
  readonly children: ReactNode
}) {
  const site = await currentSite(props.site)
  const locale = siteLocale(props.site, (await props.params).locale)
  if (locale === null) notFound()
  const shell = shellOf(site, locale)
  return (
    <html lang={locale} data-site={site.key} className={fontVariables}>
      <body>
        <SiteShell shell={{ ...shell, locale }} t={shellText(site.key, locale)}>
          {props.children}
        </SiteShell>
      </body>
    </html>
  )
}
