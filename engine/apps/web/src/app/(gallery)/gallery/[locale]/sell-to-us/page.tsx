/**
 * Sell to us (5.3.b; EXPERIENCE-GALLERY.md §2, §8): the WhatsApp and email handoff with the
 * prepared "Sell to us" message, the address as text beside it, and the optional form, which
 * posts `kind: 'sell'` to `/api/x/leads`. The form takes no photos — the page says photos travel
 * on WhatsApp or email. The proxy rewrites `/sell-to-us` to this page, the `sellToUs` surface's
 * internal folder.
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { connection } from 'next/server'

import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import { pageMetadata } from '../../../../../server/seo'
import { loadSiteSettings } from '../../../../../server/site-settings'
import { siteLocale } from '../../../../../shell/messages'
import { currentSite } from '../../../../../shell/site'
import { sellMessage, talkLinks } from '../../../../../sites/gallery/contact/handoff'
import { formText } from '../../../../../sites/gallery/contact/form-text'
import { contactText } from '../../../../../sites/gallery/contact/messages'
import { ContactPageView } from '../../../../../sites/gallery/contact/contact-page-view'

type Props = PageProps<'/gallery/[locale]/sell-to-us'>

const href = createHref(SITES.gallery)

export async function generateMetadata(props: Props): Promise<Metadata> {
  const locale = siteLocale('gallery', (await props.params).locale)
  const [site, settings] = await Promise.all([
    currentSite('gallery'),
    locale === null ? Promise.resolve(null) : loadSiteSettings('gallery', locale),
  ])
  const text = locale === null ? null : contactText(locale)
  if (locale === null || text === null || settings === null || site.origin === null) return {}
  return pageMetadata({
    site: 'gallery',
    locale,
    path: href('sellToUs', {}, locale),
    title: text('sellToUs.title'),
    description: text('sellToUs.lede'),
    origin: site.origin,
  })
}

export default async function SellToUsPage(props: Props) {
  // Dynamic at request time: the settings read is cached by tag, never at build.
  await connection()
  const locale = siteLocale('gallery', (await props.params).locale)
  if (locale === null) notFound() // the segment's not-found answers an unknown locale
  const t = contactText(locale)
  const [settings, site] = await Promise.all([
    loadSiteSettings('gallery', locale),
    currentSite('gallery'),
  ])
  const links = talkLinks(settings.contact, sellMessage(t, t('sellToUs.whatButton')))
  return (
    <ContactPageView
      kind="sell"
      locale={locale}
      t={t}
      head={{ eyebrow: t('sellToUs.eyebrow'), title: t('sellToUs.title'), lede: t('sellToUs.lede') }}
      links={links}
      contactMissing={links.wa === null && links.mail === null}
      contactHref={null}
      formText={formText(t)}
      siteKey={process.env.TURNSTILE_SITE_KEY?.trim() || null}
    />
  )
}
