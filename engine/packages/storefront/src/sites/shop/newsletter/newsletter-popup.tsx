/**
 * The newsletter pop-up's server half (TASKS.md 28.2): on the landing page only, while the owner
 * has it on (`site-settings.shop.newsletter`), with the owner's title and words (or the defaults),
 * the form's labels from the lexicon and Turnstile's public site key read at request time
 * (SECURITY.md K2: it reaches the browser only as a prop). The dialog's code loads only as it opens.
 */
import { Suspense } from 'react'

import type { SiteLocale } from '@engine/config/sites'

import { loadStorefrontSettings } from '../../../server/shop/settings/storefront'
import { siteHref } from '../../../shell/site'
import { partnershipText } from '../partnership/page-messages'
import { sectionsText } from '../sections/copy'
import { NewsletterDoor } from '../ui/lazy-islands'
import type { NewsletterText } from './state'

const ERROR_KEYS = [
  'lead.error.email',
  'lead.error.consent',
  'lead.error.invalid',
  'lead.error.challenge',
  'lead.error.rate',
  'lead.error.unavailable',
] as const

async function Popup({ locale }: { readonly locale: SiteLocale }) {
  let settings
  try {
    settings = (await loadStorefrontSettings(locale)).newsletter
  } catch {
    return null
  }
  if (!settings.enabled) return null
  const t = sectionsText(locale)
  const lead = partnershipText(locale)
  const text: NewsletterText = {
    title: settings.title,
    text: settings.text,
    email: t('newsletter.email'),
    consent: t('newsletter.consent'),
    submit: t('newsletter.submit'),
    sending: t('newsletter.sending'),
    close: t('newsletter.close'),
    success: t('newsletter.success'),
    privacy: t('newsletter.privacy'),
    errors: Object.fromEntries(ERROR_KEYS.map((key) => [key, lead(key)])),
  }
  return (
    <NewsletterDoor
      text={text}
      locale={locale === 'id' ? 'id' : 'en'}
      siteKey={process.env.TURNSTILE_SITE_KEY?.trim() || null}
      privacyHref={siteHref('shop')('page', { slug: 'privacy' }, locale)}
    />
  )
}

export function NewsletterPopup({ locale }: { readonly locale: SiteLocale }) {
  return (
    <Suspense fallback={null}>
      <Popup locale={locale} />
    </Suspense>
  )
}
