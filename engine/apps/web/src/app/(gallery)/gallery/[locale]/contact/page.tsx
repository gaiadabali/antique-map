/**
 * Contact (5.3.b; EXPERIENCE-GALLERY.md §2): the WhatsApp and email handoff, the reply promise
 * from `site-settings` when the owner has written one, and the same form as the Sell-to-us page's
 * posting `kind: 'contact'`. The proxy rewrites `/contact` to this page, the `contact` surface's
 * internal folder. (`/visit` is 5.4's page, from `pages`.)
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { connection } from 'next/server'

import { createHref, SITES } from '@engine/config/sites'

import { pageMetadata } from '../../../../../server/seo'
import { loadSiteSettings } from '../../../../../server/site-settings'
import { siteLocale } from '../../../../../shell/messages'
import { currentSite } from '../../../../../shell/site'
import { generalMessage, talkLinks } from '../../../../../sites/gallery/contact/handoff'
import { formText } from '../../../../../sites/gallery/contact/form-text'
import { contactText } from '../../../../../sites/gallery/contact/messages'
import { ContactPageView } from '../../../../../sites/gallery/contact/contact-page-view'

type Props = PageProps<'/gallery/[locale]/contact'>

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
    path: href('contact', {}, locale),
    title: text('contact.title'),
    description: text('contact.lede'),
    origin: site.origin,
  })
}

export default async function ContactPage(props: Props) {
  // Dynamic at request time: the settings read is cached by tag, never at build.
  await connection()
  const locale = siteLocale('gallery', (await props.params).locale)
  if (locale === null) notFound() // the segment's not-found answers an unknown locale
  const t = contactText(locale)
  const settings = await loadSiteSettings('gallery', locale)
  const links = talkLinks(settings.contact, generalMessage(t))
  return (
    <ContactPageView
      kind="contact"
      locale={locale}
      t={t}
      head={{
        eyebrow: t('contact.eyebrow'),
        title: t('contact.title'),
        // The reply promise is the owner's own sentence when one has arrived; the lexicon's
        // lede carries it otherwise.
        lede: settings.replyPromise ?? t('contact.lede'),
      }}
      links={links}
      contactMissing={links.wa === null && links.mail === null}
      contactHref={null}
      formText={formText(t)}
      siteKey={process.env.TURNSTILE_SITE_KEY?.trim() || null}
    />
  )
}
