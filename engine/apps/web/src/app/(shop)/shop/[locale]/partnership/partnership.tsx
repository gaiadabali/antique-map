/**
 * The shop's partnership page, from the design team's drawing: the hero, the strip of four
 * signals, the three offers (resellers, company gifting, hotels and villas) and — as the final
 * section, where the drawing had its sign-in — the enquiry call to action: WhatsApp and email
 * buttons with a prepared message, and a short form that creates a `partnership` lead (9.1.c,
 * `sites/shop/partnership`). No sign-up and no sign-in anywhere.
 */
import { Button, Eyebrow } from '../../../../../shared/ui'
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
      <div className={styles.signals}>
        <Eyebrow>{t('partnership.signalShops')}</Eyebrow>
        <Eyebrow>{t('partnership.signalWorkshop')}</Eyebrow>
        <Eyebrow>{t('partnership.signalPaper')}</Eyebrow>
        <Eyebrow>{t('partnership.signalShipping')}</Eyebrow>
      </div>
      <Offer
        eyebrow={t('partnership.resellerEyebrow')}
        title={t('partnership.resellerTitle')}
        body={t('partnership.resellerBody')}
        cta={t('partnership.resellerCta')}
        poster={t('partnership.posterReseller')}
        specs={[
          [t('partnership.labelPricing'), t('partnership.resellerPricing')],
          [t('partnership.labelMinimum'), t('partnership.resellerMinimum')],
          [t('partnership.labelReorder'), t('partnership.resellerReorder')],
          [t('partnership.labelDisplay'), t('partnership.resellerDisplay')],
        ]}
      />
      <Offer
        eyebrow={t('partnership.companyEyebrow')}
        title={t('partnership.companyTitle')}
        body={t('partnership.companyBody')}
        cta={t('partnership.companyCta')}
        poster={t('partnership.posterCompany')}
        specs={[
          [t('partnership.labelCustom'), t('partnership.companyCustom')],
          [t('partnership.labelBranding'), t('partnership.companyBranding')],
          [t('partnership.labelQuantity'), t('partnership.companyQuantity')],
          [t('partnership.labelLeadTime'), t('partnership.companyLeadTime')],
        ]}
      />
      <Offer
        eyebrow={t('partnership.hotelEyebrow')}
        title={t('partnership.hotelTitle')}
        body={t('partnership.hotelBody')}
        cta={t('partnership.hotelCta')}
        poster={t('partnership.posterHotel')}
        specs={[
          [t('partnership.labelThemed'), t('partnership.hotelThemed')],
          [t('partnership.labelSizes'), t('partnership.hotelSizes')],
          [t('partnership.labelRepeat'), t('partnership.hotelRepeat')],
          [t('partnership.labelSample'), t('partnership.hotelSample')],
        ]}
      />
      <Enquire contact={contact} t={t} locale={locale} turnstileSiteKey={turnstileSiteKey} />
    </div>
  )
}

function Hero({ t }: Pick<Props, 't'>) {
  return (
    <section className={styles.section}>
      <Eyebrow>{t('partnership.eyebrow')}</Eyebrow>
      <h1>{t('partnership.title')}</h1>
      <p className={`site-lede ${styles.lede}`}>{t('partnership.lede')}</p>
      <div className={styles.actions}>
        <Button variant="primary" href="#enquire">
          {t('partnership.ctaApply')}
        </Button>
      </div>
    </section>
  )
}

function Offer({
  eyebrow,
  title,
  body,
  cta,
  poster,
  specs,
}: {
  eyebrow: string
  title: string
  body: string
  cta: string
  poster: string
  specs: readonly (readonly [string, string])[]
}) {
  return (
    <section className={styles.section}>
      <div className={styles.offer}>
        <div className={styles.offerBody}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2>{title}</h2>
          <p className={styles.specValue}>{body}</p>
          {specs.map(([label, value]) => (
            <p className={styles.spec} key={label}>
              <span className={styles.specLabel}>{label}</span>
              <span className={styles.specValue}>{value}</span>
            </p>
          ))}
          <div className={styles.actions}>
            <Button variant="secondary" href="#enquire">
              {cta}
            </Button>
          </div>
        </div>
        <div className={styles.plate}>
          <span className={styles.plateInner}>{poster}</span>
        </div>
      </div>
    </section>
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
    <section className={styles.section} id="enquire">
      <div className={styles.enquire}>
        <div>
          <Eyebrow>{t('partnership.enquireEyebrow')}</Eyebrow>
          <h2>{t('partnership.enquireTitle')}</h2>
          <p className={styles.specValue}>{t('partnership.enquireBody')}</p>
          <div className={styles.talk}>
            <p className={styles.specValue}>{t('partnership.talkFirst')}</p>
            {wa || mail ? (
              <div className={styles.talkActions}>
                {wa && (
                  <Button variant="primary" href={wa}>
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
        <PartnershipForm text={formText(t)} locale={locale} siteKey={turnstileSiteKey} />
      </div>
    </section>
  )
}
