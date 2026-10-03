/**
 * The shop's partnership page (ticket 4.3.c): the composition lives beside it, this page hands it
 * the lexicon's words and the site-settings contact for the WhatsApp and email buttons, and names
 * the page in the metadata. The enquiry form's submit stays a placeholder until 9.1 wires a
 * `partnership` lead.
 */
import type { Metadata } from 'next'
import { connection } from 'next/server'

import type { SiteLocale } from '@engine/config/sites'

import { siteMetadata } from '../../../../../shell/site-root'
import { loadSiteSettings } from '../../../../../server/site-settings'
import { Partnership } from './partnership'
import { partnershipText } from './partnership-messages'

export async function generateMetadata({
  params,
}: PageProps<'/shop/[locale]/partnership'>): Promise<Metadata> {
  const { locale } = await params
  const site = await siteMetadata('shop', params)
  return {
    ...site,
    title: partnershipText(locale as SiteLocale)('partnership.eyebrow'),
  }
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
    />
  )
}
