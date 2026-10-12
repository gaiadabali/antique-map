/**
 * The shop's partnership page (Ivory and ink 18): the page's head sits on the paper, a strip of
 * four facts, the three offers (resellers, company gifting, hotels and villas) as typographic
 * columns under a strong ink rule and — as the final section — the enquiry call to action
 * on the stone:
 * WhatsApp and email buttons with a prepared message, and a short form that creates a
 * `partnership` lead (9.1.c, `sites/shop/partnership`). No sign-up and no sign-in anywhere.
 */
import { Band, Button, ProofPoints, SectionHead } from '../../../../../shared/ui'
import { formText } from '../../../../../sites/shop/partnership/form-text'
import { PartnershipForm } from '../../../../../sites/shop/partnership/partnership-form'

import styles from './partnership.module.css'
import type { PartnershipText } from './partnership-messages'

type Props = {
  /** The site-settings contact, or `null` when it answers none — the CTA buttons then stay out. */
  readonly contact: { readonly whatsapp: string | null; readonly email: string | null }
  readonly t: PartnershipText
  readonly locale: 'en' | 'id'
  /** Turnstile's public site key, or `null` while the host has none: the form is then switched off. */
  readonly turnstileSiteKey: string | null
}

export function Partnership({ contact, t, locale, turnstileSiteKey }: Props) {
  return (
    <div className={styles.wrap}>
      <Hero t={t} />
      <ProofPoints
        className={styles.proof}
        items={[
          t('partnership.signalShops'),
          t('partnership.signalWorkshop'),
          t('partnership.signalPaper'),
          t('partnership.signalShipping'),
        ]}
      />
      <section className={styles.offers}>
        <Offer
          title={t('partnership.resellerTitle')}
          body={t('partnership.resellerBody')}
          cta={t('partnership.resellerCta')}
          specs={[
            [t('partnership.labelPricing'), t('partnership.resellerPricing')],
            [t('partnership.labelMinimum'), t('partnership.resellerMinimum')],
            [t('partnership.labelReorder'), t('partnership.resellerReorder')],
            [t('partnership.labelDisplay'), t('partnership.resellerDisplay')],
          ]}
        />
        <Offer
          title={t('partnership.companyTitle')}
          body={t('partnership.companyBody')}
          cta={t('partnership.companyCta')}
          specs={[
            [t('partnership.labelCustom'), t('partnership.companyCustom')],
            [t('partnership.labelBranding'), t('partnership.companyBranding')],
            [t('partnership.labelQuantity'), t('partnership.companyQuantity')],
            [t('partnership.labelLeadTime'), t('partnership.companyLeadTime')],
          ]}
        />
        <Offer
          title={t('partnership.hotelTitle')}
          body={t('partnership.hotelBody')}
          cta={t('partnership.hotelCta')}
          specs={[
            [t('partnership.labelThemed'), t('partnership.hotelThemed')],
            [t('partnership.labelSizes'), t('partnership.hotelSizes')],
            [t('partnership.labelRepeat'), t('partnership.hotelRepeat')],
            [t('partnership.labelSample'), t('partnership.hotelSample')],
          ]}
        />
      </section>
      <Enquire contact={contact} t={t} locale={locale} turnstileSiteKey={turnstileSiteKey} />
    </div>
  )
}

/** The page opens on its paper, right under the header: the title, its lede, the way in. */
function Hero({ t }: Pick<Props, 't'>) {
  return (
    <Band
      pigment={1}
      strength="wash"
      pad={false}
      className={styles.lead}
      aria-labelledby="partnership-title"
    >
      <SectionHead
        level={1}
        id="partnership-title"
        className={styles.leadHead}
        title={t('partnership.title')}
        lede={t('partnership.lede')}
        action={
          <Button variant="secondary" href="#enquire">
            {t('partnership.ctaApply')}
          </Button>
        }
      />
    </Band>
  )
}

/** One offer as a typographic column opened by a strong ink rule, its terms as a ruled list. */
function Offer({
  title,
  body,
  cta,
  specs,
}: {
  title: string
  body: string
  cta: string
  specs: readonly (readonly [string, string])[]
}) {
  return (
    <article className={styles.offer}>
      <h2 className={styles.offerTitle}>{title}</h2>
      <p className={styles.offerBody}>{body}</p>
      <dl className={styles.specs}>
        {specs.map(([label, value]) => (
          <div className={styles.spec} key={label}>
            <dt className={styles.specLabel}>{label}</dt>
            <dd className={styles.specValue}>{value}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.actions}>
        <Button variant="quiet" href="#enquire">
          {cta}
        </Button>
      </div>
    </article>
  )
}

/** The enquiry CTA. WhatsApp and email carry a prepared message; the form makes a `partnership` lead. */
function Enquire({ contact, t, locale, turnstileSiteKey }: Props) {
  const wa = contact.whatsapp
    ? `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
        t('partnership.whatsappMessage'),
      )}`
    : null
  const mail = contact.email
    ? `mailto:${contact.email}?subject=${encodeURIComponent(
        t('partnership.emailSubject'),
      )}&body=${encodeURIComponent(t('partnership.emailBody'))}`
    : null
  return (
    <Band
      pigment={1}
      strength="tint"
      className={styles.enquire}
      id="enquire"
      aria-labelledby="partnership-enquire"
    >
      <div className={styles.enquireGrid}>
        <div className={styles.enquireText}>
          <SectionHead
            id="partnership-enquire"
            title={t('partnership.enquireTitle')}
            lede={t('partnership.enquireBody')}
          />
          <div className={styles.talk}>
            <p className={styles.specValue}>{t('partnership.talkFirst')}</p>
            {wa || mail ? (
              <div className={styles.talkActions}>
                {wa && (
                  <Button variant="secondary" href={wa}>
                    {t('partnership.ctaWhatsapp')}
                  </Button>
                )}
                {mail && (
                  <Button variant="quiet" href={mail}>
                    {t('partnership.ctaEmail')}
                  </Button>
                )}
              </div>
            ) : (
              <p className={styles.formNote}>{t('partnership.contactMissing')}</p>
            )}
          </div>
        </div>
        <div className={styles.panel}>
          <PartnershipForm text={formText(t)} locale={locale} siteKey={turnstileSiteKey} />
        </div>
      </div>
    </Band>
  )
}
