/**
 * The two pages each site has today, at placeholder fidelity (phase 4 builds the design team's
 * home pages): the home — the site's name and its own line, in the locale the proxy routed to,
 * `/` for English and `/id` for Indonesian — and the designed not-found page. Both read their
 * words from the site's copy and their links from `href()`; neither holds a word or a path.
 */
import type { SiteKey } from '@engine/config/sites'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'

import { siteLocale } from './messages'
import { currentSite, shellText, siteHref } from './site'

export async function HomePage(props: {
  readonly site: SiteKey
  readonly params: Promise<{ locale: string }>
}) {
  const site = await currentSite(props.site)
  const locale = siteLocale(props.site, (await props.params).locale)
  if (locale === null) notFound()
  const t = shellText(site.key, locale)
  return (
    <>
      <h1>{t('home.title', { brand: site.name })}</h1>
      <p className="site-lede">{t('home.lede')}</p>
    </>
  )
}

/**
 * The designed not-found page, inside the site's layout. It gets no params, so it reads the locale
 * the proxy passed on (`x-locale`, which overwrites whatever a client sent), falling back to the
 * site's default.
 */
export async function NotFoundPage(props: { readonly site: SiteKey }) {
  const site = await currentSite(props.site)
  const asked = (await headers()).get(PROXY_REQUEST_HEADERS.locale)
  const locale = siteLocale(site.key, asked) ?? site.locales.default
  const t = shellText(site.key, locale)
  return (
    <>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.body')}</p>
      <p>
        <a href={siteHref(site.key)('home', {}, locale)}>{t('notFound.home')}</a>
      </p>
    </>
  )
}
