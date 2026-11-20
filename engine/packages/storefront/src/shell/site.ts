/**
 * The shop as one request sees it, read at request time. The app serving it is known from its tree
 * (today's app rewrote the request into `app/(shop)/shop/…`; the shop app serves nothing else), so
 * nothing here trusts a header. What it adds is the canonical origin, from the environment: the shop
 * app's `SITE_HOSTS`, or today's two-site `SHOP_HOSTS` (`siteOrigin`) — the process's, so never read
 * while `next build` prerenders: `connection()` comes first.
 */
import {
  appOrigin,
  createHref,
  siteOrigin,
  SITES,
  type Href,
  type SiteLocale,
} from '@engine/config/sites'
import { SITE_ASSETS } from '@engine/http/manifest'
import type { ShellMessageKey } from '@engine/i18n/shell'
import { connection } from 'next/server'

import { siteMessages } from './messages'

export type CurrentSite = (typeof SITES)['shop'] & {
  /** The canonical origin every absolute URL is built on; `null` while the host list is unusable. */
  readonly origin: string | null
}

/** The shop's canonical origin: the one-app list when the process has one, else the two-site one. */
export function shopOrigin(env: Readonly<Record<string, string | undefined>> = process.env) {
  return env.SITE_HOSTS?.trim() ? appOrigin('shop', env) : siteOrigin('shop', env)
}

export async function currentSite(key: 'shop'): Promise<CurrentSite> {
  await connection()
  return { ...SITES[key], origin: shopOrigin() }
}

const shopHref: Href = createHref(SITES.shop)

/** The shop's `href()`: every link a page renders, built on the server, never spelt by hand. */
export function siteHref(key: 'shop'): Href {
  void key
  return shopHref
}

/** A shop file's public path, `/shop/<file>`, which the proxy passes through on the shop's hosts. */
export function siteAsset(key: 'shop', file: (typeof SITE_ASSETS)[keyof typeof SITE_ASSETS]) {
  return `/${key}/${file}`
}

export type ShellText = (key: ShellMessageKey, params?: Record<string, string>) => string

/** The shell's words for the shop and a locale. */
export function shellText(site: 'shop', locale: SiteLocale): ShellText {
  const { t } = siteMessages(site, locale)
  return (key, params) => t(key, params)
}
