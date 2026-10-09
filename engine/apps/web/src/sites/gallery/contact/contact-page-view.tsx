/**
 * The Sell-to-us and Contact pages' composition (5.3.b): the page's words, the WhatsApp and email
 * handoff buttons with their prepared message (§8) and the address as text beside them, and — the
 * last section — the optional form, which posts `kind: 'sell'` or `kind: 'contact'`. The form takes
 * no photos: the Sell-to-us page says photos travel on WhatsApp or email. The contact values come
 * from `loadSiteSettings()`; when neither has arrived yet (OA2) the buttons give way to the
 * placeholder notice and the button links the Contact page — never a fake number.
 */
import { Button, SectionHead, TextLink } from '../../../shared/ui'

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
  readonly head: { readonly eyebrow: string; readonly title: string; readonly lede: string }
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
      <SectionHead level={1} eyebrow={head.eyebrow} title={head.title} lede={head.lede} />
      <div className={styles.grid}>
        <div className={styles.side}>
          <div className={styles.talk}>
            {contactMissing ? (
              <>
                <p className={styles.note}>{t('contactPage.placeholder')}</p>
                {contactHref !== null && (
                  <TextLink href={contactHref}>{t('contact.eyebrow')}</TextLink>
                )}
              </>
            ) : (
              <div className={styles.actions}>
                {links.wa !== null && (
                  <Button variant="primary" href={links.wa}>
                    {t('contactPage.whatsappLink')}
                  </Button>
                )}
                {links.mail !== null && (
                  <Button variant="quiet" href={links.mail}>
                    {t('contactPage.emailLink')}
                  </Button>
                )}
              </div>
            )}
            {links.mail !== null && links.address !== null && (
              <p className={styles.note}>
                {t('contactPage.emailOr')} <TextLink href={links.mail}>{links.address}</TextLink>
              </p>
            )}
            <p className={styles.promise}>{t('contactPage.replyPromise')}</p>
            {kind === 'sell' && <p className={styles.note}>{t('sellToUs.photosNote')}</p>}
            {kind === 'contact' && <p className={styles.note}>{t('contact.viewingNote')}</p>}
          </div>
          {kind === 'sell' && (
            <section className={styles.steps} aria-labelledby="sell-steps">
              <SectionHead id="sell-steps" title={t('sellToUs.stepsTitle')} />
              <ol className={styles.stepList}>
                {STEPS.map((n) => (
                  <li className={styles.step} key={n}>
                    <span className={styles.number} aria-hidden="true">
                      {`0${n}`}
                    </span>
                    <div>
                      <h3 className={styles.stepTitle}>{t(`sellToUs.step${n}Title`)}</h3>
                      <p className={styles.stepBody}>{t(`sellToUs.step${n}Body`)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
        <div className={styles.panel}>
          <LeadForm kind={kind} text={formText} locale={locale} siteKey={siteKey} />
        </div>
      </div>
    </div>
  )
}
