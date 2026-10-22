/**
 * The partnership enquiry and the partners' sign-in as blocks. The enquiry: WhatsApp and email with
 * a prepared message, and the short form that creates a `partnership` lead (9.1.c, `./partnership-
 * form`) on white. The sign-in: an approved partner's sign-in, or their account once signed in
 * (`./partner-panel`). The words around them are the page's blocks; the form's own labels, checks
 * and messages are the lexicon's (`./page-messages`), and the contact is site-settings'. Turnstile's
 * public site key is read here at request time and reaches the browser only as a prop (SECURITY.md
 * K2).
 */
import type { SiteLocale } from '@engine/config/sites'

import type { EnquiryVM, PartnerSignInVM } from '../../../server/shop/pages/blocks'
import { loadSiteSettings } from '../../../server/site-settings'
import { siteHref } from '../../../shell/site'
import { Caps } from '../ui/caps-link'
import { formText } from './form-text'
import { partnershipText, type PartnershipText } from './page-messages'
import { PartnerPanel, type PartnerPanelText } from './partner-panel'
import { PartnershipForm } from '../ui/lazy-islands'
import styles from './partnership-page.module.css'
import { segmentText } from './segments'

type Contact = { readonly whatsapp: string | null; readonly email: string | null }

async function contactOf(locale: SiteLocale): Promise<Contact> {
  const settings = await loadSiteSettings('shop', locale)
  return { whatsapp: settings.contact.whatsapp, email: settings.contact.email }
}

/** The enquiry. WhatsApp and email carry a prepared message; the form makes a `partnership` lead. */
export async function Enquiry({
  locale,
  block,
}: {
  readonly locale: 'en' | 'id'
  readonly block: EnquiryVM
}) {
  const t = partnershipText(locale)
  const contact = await contactOf(locale)
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim() || null
  const message = block.whatsappMessage ?? t('partnership.whatsappMessage')
  const wa = contact.whatsapp
    ? `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    : null
  const mail = contact.email
    ? `mailto:${contact.email}?subject=${encodeURIComponent(
        t('partnership.emailSubject'),
      )}&body=${encodeURIComponent(t('partnership.emailBody'))}`
    : null
  const titleId = `enquiry-${block.id}`
  return (
    <section id={block.anchor ?? undefined} className={styles.apply} aria-labelledby={titleId}>
      <div className={styles.applyText}>
        {block.eyebrow ? <Caps className={styles.eyebrow}>{block.eyebrow}</Caps> : null}
        <h2 id={titleId} className={styles.applyTitle}>
          {block.title}
        </h2>
        {block.body ? <p className={styles.applyBody}>{block.body}</p> : null}
        {/* "Prefer to talk first?" over the WhatsApp number, as drawn (email when there is none). */}
        <p className={styles.talk}>
          {block.talkFirst ?? t('partnership.talkFirst')}
          <br />
          {wa && contact.whatsapp ? (
            // a new tab, so the form and what the visitor typed stay open behind WhatsApp
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('partnership.talkWhatsappLabel', {
                number: spacedNumber(contact.whatsapp),
              })}
              className={styles.talkLink}
            >
              {t('partnership.talkWhatsapp', { number: spacedNumber(contact.whatsapp) })}
            </a>
          ) : mail ? (
            <a href={mail} className={styles.talkLink}>
              {t('partnership.ctaEmail')}
            </a>
          ) : (
            <span className={styles.note}>{t('partnership.contactMissing')}</span>
          )}
        </p>
      </div>
      <div className={styles.panel}>
        <PartnershipForm
          text={formText(t)}
          segments={segmentText(locale)}
          locale={locale}
          siteKey={siteKey}
          privacyHref={siteHref('shop')('page', { slug: 'privacy' }, locale)}
        />
      </div>
    </section>
  )
}

/** "Already a partner": the sign-in, or the partner's account once signed in. */
export async function PartnerSignIn({
  locale,
  block,
}: {
  readonly locale: 'en' | 'id'
  readonly block: PartnerSignInVM
}) {
  const t = partnershipText(locale)
  const contact = await contactOf(locale)
  return (
    <PartnerPanel
      text={{
        ...panelText(t, contact),
        ...(block.eyebrow ? { eyebrow: block.eyebrow } : {}),
        title: block.title,
        ...(block.body ? { body: block.body } : {}),
      }}
    />
  )
}

/** The partner sign-in's words, resolved here: the form is a Client Component. */
function panelText(t: PartnershipText, contact: Contact): PartnerPanelText {
  const ask = encodeURIComponent(t('partnership.signInForgotMessage'))
  const forgotHref = contact.whatsapp
    ? `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}?text=${ask}`
    : contact.email
      ? `mailto:${contact.email}?subject=${ask}`
      : '#apply'
  return {
    eyebrow: t('partnership.signInEyebrow'),
    title: t('partnership.signInTitle'),
    body: t('partnership.signInBody'),
    welcome: (name) => t('partnership.accountTitle', { name }),
    accountBody: t('partnership.accountBody'),
    accountEmail: t('partnership.accountEmail'),
    signOut: t('partnership.signOut'),
    form: {
      email: t('partnership.signInEmail'),
      password: t('partnership.signInPassword'),
      submit: t('partnership.signInSubmit'),
      sending: t('partnership.signInSending'),
      forgot: t('partnership.signInForgot'),
      forgotHref,
      reasons: {
        invalid: t('partnership.signInInvalid'),
        locked: t('partnership.signInLocked'),
        rate: t('partnership.signInRate'),
        missing: t('partnership.signInMissing'),
        unavailable: t('partnership.signInUnavailable'),
      },
    },
  }
}

/** An E.164 number as people read it: +62 813 1900 4269 (other countries as stored). */
function spacedNumber(e164: string): string {
  const match = /^\+62(\d{3})(\d{4})(\d+)$/.exec(e164)
  return match ? `+62 ${match[1]} ${match[2]} ${match[3]}` : e164
}
