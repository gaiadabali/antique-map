/**
 * The Sell-to-us and Contact pages' composition (5.3.b; Ivory and ink 18): the page opens on its
 * paper; WhatsApp and email follow as large type links with their prepared message (§8),
 * the address and the reply promise beside them; on Sell-to-us the three steps stand in order in
 * three columns; and — the last section, on the stone with no box — the optional form, which
 * posts `kind: 'sell'` or `kind: 'contact'`. The form takes
 * no photos: the Sell-to-us page says photos travel on WhatsApp or email. The contact values come
 * from `loadSiteSettings()`; when neither has arrived yet (OA2) the buttons give way to the
 * placeholder notice and the button links the Contact page — never a fake number.
 */
import { Band, SectionHead, TextLink } from '../../../shared/ui'

import type { LeadFormKind } from './lead-form-view'
import { LeadForm } from './lead-form'
import type { ContactText } from './messages'
import type { Handoff } from './handoff'
import styles from './contact.module.css'
import type { FormText } from './form-text'

type Props = {
  readonly kind: LeadFormKind
  readonly locale: 'en' | 'id'
  readonly t: ContactText
  /** The page's head words, already in the page's language. */
  readonly head: { readonly title: string; readonly lede: string }
  /** The handoff's links, or `null` each where the channel has not arrived (OA2). */
  readonly links: Handoff
  /** True when neither channel has arrived: the placeholder notice stands in for both. */
  readonly contactMissing: boolean
  /** The Contact page's address, when the page is not the Contact page itself. */
  readonly contactHref: string | null
  readonly formText: FormText
  /** Turnstile's public site key, or `null` while the host has none: the form is then off. */
  readonly siteKey: string | null
}

export function ContactPageView({
  kind,
  locale,
  t,
  head,
  links,
  contactMissing,
  contactHref,
  formText,
  siteKey,
}: Props) {
  const STEPS = [1, 2, 3] as const
  return (
    <div className={styles.wrap}>
      <Band pigment={1} strength="wash" pad={false} className={styles.band}>
        <SectionHead level={1} title={head.title} lede={head.lede} />
      </Band>
      <section className={styles.talk}>
        <div className={styles.channel}>
          {contactMissing ? (
            <>
              <p className={styles.line}>{t('contactPage.placeholder')}</p>
              {contactHref !== null && (
                <TextLink href={contactHref}>{t('contact.eyebrow')}</TextLink>
              )}
            </>
          ) : (
            links.wa !== null && (
              <a className={styles.big} href={links.wa}>
                {t('contactPage.whatsappLink')}
              </a>
            )
          )}
          {kind === 'sell' && <p className={styles.note}>{t('sellToUs.photosNote')}</p>}
          {kind === 'contact' && <p className={styles.line}>{t('contact.viewingNote')}</p>}
        </div>
        <div className={styles.channel}>
          {!contactMissing && links.mail !== null && (
            <a className={styles.big} href={links.mail}>
              {t('contactPage.emailLink')}
            </a>
          )}
          {links.mail !== null && links.address !== null && (
            <p className={styles.note}>
              {t('contactPage.emailOr')} <TextLink href={links.mail}>{links.address}</TextLink>
            </p>
          )}
          <p className={styles.promise}>{t('contactPage.replyPromise')}</p>
        </div>
      </section>
      {kind === 'sell' && (
        <section className={styles.steps} aria-labelledby="sell-steps">
          <SectionHead id="sell-steps" title={t('sellToUs.stepsTitle')} />
          <ol className={styles.stepList}>
            {STEPS.map((n) => (
              <li className={styles.step} key={n}>
                <span className={styles.number} aria-hidden="true">
                  {n}
                </span>
                <h3 className={styles.stepTitle}>{t(`sellToUs.step${n}Title`)}</h3>
                <p className={styles.stepBody}>{t(`sellToUs.step${n}Body`)}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      <Band pigment={1} strength="tint" className={styles.formBand} aria-labelledby="lead-form">
        <div className={styles.formGrid}>
          <h2 id="lead-form" className={styles.formTitle}>
            {formText['contactForm.eyebrow']}
          </h2>
          <div className={styles.panel}>
            <LeadForm kind={kind} text={formText} locale={locale} siteKey={siteKey} />
          </div>
        </div>
      </Band>
    </div>
  )
}
