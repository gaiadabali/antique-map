/**
 * The site a request is for, read at request time. A page knows its site from its tree — the proxy
 * rewrote the request into `app/(<site>)/<site>/…` because its `Host` named that site — so nothing
 * here trusts a header. What it adds is the site's canonical origin, from the host allow-list in the
 * environment, which is the process's and so must never be read while `next build` prerenders: it
 * awaits `connection()` first. Next renders a layout and its page concurrently, so the layout's
 * own `connection()` does not hold the page back (the Cache Components spike §1); every caller —
 * a layout, a page, metadata — comes through here.
 */
import { createHref, siteOrigin, SITES, type Href, type SiteKey } from '@engine/config/sites'
import type { SiteShellVM } from '@engine/view-models'
import { connection } from 'next/server'

import { SITE_ASSETS } from '@engine/http/manifest'

import { siteMessages, type ShellMessageKey } from './messages'
import type { SiteLocale } from '@engine/config/sites'

export type CurrentSite = (typeof SITES)[SiteKey] & {
  /** The canonical origin every absolute URL is built on; `null` while the allow-list is unusable. */
  readonly origin: string | null
}

export async function currentSite(key: SiteKey): Promise<CurrentSite> {
  await connection()
  return { ...SITES[key], origin: siteOrigin(key) }
}

const hrefs = new Map<SiteKey, Href>()

/** The site's `href()`: every link a page renders, built on the server, never spelt by hand. */
export function siteHref(key: SiteKey): Href {
  let href = hrefs.get(key)
  if (!href) {
    href = createHref(SITES[key])
    hrefs.set(key, href)
  }
  return href
}

/** A site file's public path: `/<site>/<file>`, the one the proxy passes through on its host. */
export function siteAsset(key: SiteKey, file: (typeof SITE_ASSETS)[keyof typeof SITE_ASSETS]) {
  return `/${key}/${file}`
}

/** The placeholder shell's view model for one site and locale. */
export function shellOf(site: CurrentSite, locale: SiteLocale): SiteShellVM {
  const href = siteHref(site.key)
  return {
    site: { key: site.key, name: site.name, origin: site.origin },
    locale,
    homeHref: href('home', {}, locale),
    locales: site.locales.supported.map((each) => ({
      locale: each,
      href: href('home', {}, each),
      current: each === locale,
    })),
    logo: siteAsset(site.key, SITE_ASSETS.logo),
  }
}

export type ShellText = (key: ShellMessageKey, params?: Record<string, string>) => string

/** The shell's words for a site and locale. */
export function shellText(site: SiteKey, locale: SiteLocale): ShellText {
  const { t } = siteMessages(site, locale)
  return (key, params) => t(key, params)
}
