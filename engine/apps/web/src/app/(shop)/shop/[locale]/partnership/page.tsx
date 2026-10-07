/**
 * The shop's partnership page (ticket 4.3.c): the composition lives beside it, this page hands it
 * the lexicon's words and the site-settings contact for the WhatsApp and email buttons, and names
 * the page in the metadata. The enquiry form makes a `partnership` lead (9.1.c); Turnstile's public
 * site key is read here, at request time, and reaches the browser only as a prop (SECURITY.md K2).
 */
import type { Metadata } from 'next'
import { connection } from 'next/server'

import type { SiteLocale } from '@engine/config/sites'

import { pageMetadata } from '../../../../../server/seo'
import { loadSiteSettings } from '../../../../../server/site-settings'
import { siteLocale } from '../../../../../shell/messages'
import { currentSite, siteHref } from '../../../../../shell/site'
import { Partnership } from './partnership'
import { partnershipText } from './partnership-messages'

export async function generateMetadata({
  params,
}: PageProps<'/shop/[locale]/partnership'>): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const t = partnershipText(locale)
  const href = siteHref('shop')
  return pageMetadata({
    site: 'shop',
    locale,
    paths: { en: href('partnership', {}, 'en'), id: href('partnership', {}, 'id') },
    title: t('partnership.eyebrow'),
    description: t('partnership.lede'),
    origin: site.origin,
  })
}

export default async function PartnershipPage({ params }: PageProps<'/shop/[locale]/partnership'>) {
  // Dynamic at request time: the settings read is cached by tag, never at build — and the layout's
  // own `connection()` does not hold this page back (shell/site.ts).
  await connection()
  const { locale } = await params
  const settings = await loadSiteSettings('shop', locale as SiteLocale)
  return (
    <Partnership
      contact={{ whatsapp: settings.contact.whatsapp, email: settings.contact.email }}
      t={partnershipText(locale as SiteLocale)}
      locale={locale === 'id' ? 'id' : 'en'}
      turnstileSiteKey={process.env.TURNSTILE_SITE_KEY?.trim() || null}
    />
  )
}
