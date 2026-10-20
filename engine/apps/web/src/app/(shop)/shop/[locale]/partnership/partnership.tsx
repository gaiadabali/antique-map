/**
 * The shop's partnership page (the redesign of 2026-10-20, the handoff's `Partnership`): a hero of
 * two halves — the words on the warm left, a framed print on the grey right — a warm band of four
 * facts, the three offers (resellers, company gifting, hotels and villas) as alternating stories
 * with their terms as a ruled list beside two framed prints, and the enquiry as the last band: the
 * WhatsApp and email buttons with a prepared message, and the short form that creates a
 * `partnership` lead (9.1.c, `sites/shop/partnership`) on white — and, last, "Already a partner":
 * an approved partner's sign-in, or their account once signed in (`PartnerPanel`).
 */
import { Button } from '../../../../../shared/ui'
import { siteHref } from '../../../../../shell/site'
import { FeaturedPrint } from '../../../../../sites/shop/home/featured-print'
import { formText } from '../../../../../sites/shop/partnership/form-text'
import { PartnershipForm } from '../../../../../sites/shop/partnership/partnership-form'
import { segmentText } from '../../../../../sites/shop/partnership/segments'
import {
  PartnerPanel,
  type PartnerPanelText,
} from '../../../../../sites/shop/partnership/partner-panel'
import { Caps, CapsLink } from '../../../../../sites/shop/ui/caps-link'

import styles from './partnership.module.css'
import type { PartnershipMessageKey, PartnershipText } from './partnership-messages'

type Props = {
  /** The site-settings contact, or `null` when it answers none — the CTA buttons then stay out. */
  readonly contact: { readonly whatsapp: string | null; readonly email: string | null }
  readonly t: PartnershipText
  readonly locale: 'en' | 'id'
  /** Turnstile's public site key, or `null` while the host has none: the form is then switched off. */
  readonly turnstileSiteKey: string | null
}

type OfferSpec = {
  readonly id: string
  readonly eyebrow: PartnershipMessageKey
  readonly title: PartnershipMessageKey
  readonly body: PartnershipMessageKey
  readonly cta: PartnershipMessageKey
  readonly specs: readonly (readonly [PartnershipMessageKey, PartnershipMessageKey])[]
}

const OFFERS: readonly OfferSpec[] = [
  {
    id: 'reseller',
    eyebrow: 'partnership.resellerEyebrow',
    title: 'partnership.resellerTitle',
    body: 'partnership.resellerBody',
    cta: 'partnership.resellerCta',
    specs: [
      ['partnership.labelPricing', 'partnership.resellerPricing'],
      ['partnership.labelMinimum', 'partnership.resellerMinimum'],
      ['partnership.labelReorder', 'partnership.resellerReorder'],
      ['partnership.labelDisplay', 'partnership.resellerDisplay'],
    ],
  },
  {
    id: 'company',
    eyebrow: 'partnership.companyEyebrow',
    title: 'partnership.companyTitle',
    body: 'partnership.companyBody',
    cta: 'partnership.companyCta',
    specs: [
      ['partnership.labelCustom', 'partnership.companyCustom'],
      ['partnership.labelBranding', 'partnership.companyBranding'],
      ['partnership.labelQuantity', 'partnership.companyQuantity'],
      ['partnership.labelLeadTime', 'partnership.companyLeadTime'],
    ],
  },
  {
    id: 'hotel',
    eyebrow: 'partnership.hotelEyebrow',
    title: 'partnership.hotelTitle',
    body: 'partnership.hotelBody',
    cta: 'partnership.hotelCta',
    specs: [
      ['partnership.labelThemed', 'partnership.hotelThemed'],
      ['partnership.labelSizes', 'partnership.hotelSizes'],
      ['partnership.labelRepeat', 'partnership.hotelRepeat'],
      ['partnership.labelSample', 'partnership.hotelSample'],
    ],
  },
]

const FACTS = [
  'partnership.signalShops',
  'partnership.signalWorkshop',
  'partnership.signalPaper',
  'partnership.signalShipping',
] as const

export function Partnership({ contact, t, locale, turnstileSiteKey }: Props) {
  return (
    <div className={styles.wrap}>
      <section className={styles.hero} aria-labelledby="partnership-title">
        <div className={styles.heroWords}>
          <div className={styles.heroBlock}>
            <Caps className={styles.eyebrow}>{t('partnership.eyebrow')}</Caps>
            <h1 id="partnership-title" className={styles.heroTitle}>
              {t('partnership.title')}
            </h1>
            <p className={styles.heroLede}>{t('partnership.lede')}</p>
            <div className={styles.heroActions}>
              <Button variant="primary" size="small" href="#enquire">
                {t('partnership.ctaApply')}
              </Button>
              <CapsLink href="#signin">{t('partnership.signInLink')}</CapsLink>
            </div>
          </div>
        </div>
        <div className={styles.heroWall}>
          <FeaturedPrint locale={locale} index={4} sizes="45vw" className={styles.heroTile} />
        </div>
      </section>

      <ul className={styles.trust}>
        {FACTS.map((key) => (
          <li key={key}>
            <Caps>{t(key)}</Caps>
          </li>
        ))}
      </ul>

      {OFFERS.map((offer, index) => (
        <section
          key={offer.id}
          id={offer.id}
          className={styles.story}
          data-warm={index === 1 || undefined}
          aria-labelledby={`partnership-${offer.id}`}
        >
          <div className={styles.storyText}>
            <Caps className={styles.eyebrow}>{t(offer.eyebrow)}</Caps>
            <h2 id={`partnership-${offer.id}`} className={styles.storyTitle}>
              {t(offer.title)}
            </h2>
            <p className={styles.storyBody}>{t(offer.body)}</p>
            <dl className={styles.specs}>
              {offer.specs.map(([label, value]) => (
                <div className={styles.spec} key={label}>
                  <dt>{t(label)}</dt>
                  <dd>{t(value)}</dd>
                </div>
              ))}
            </dl>
            <CapsLink href="#enquire">{t(offer.cta)}</CapsLink>
          </div>
          <div className={styles.storyPhotos}>
            <FeaturedPrint
              locale={locale}
              index={index * 2}
              sizes="(max-width: 56.25rem) 80vw, 33vw"
              className={styles.photo}
            />
            <FeaturedPrint
              locale={locale}
              index={index * 2 + 1}
              sizes="(max-width: 56.25rem) 80vw, 33vw"
              className={styles.photo}
            />
          </div>
        </section>
      ))}

      <Enquire contact={contact} t={t} locale={locale} turnstileSiteKey={turnstileSiteKey} />
      <PartnerPanel text={panelText(t, contact)} />
    </div>
  )
}

/** The enquiry. WhatsApp and email carry a prepared message; the form makes a `partnership` lead. */
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
    <section id="enquire" className={styles.apply} aria-labelledby="partnership-enquire">
      <div className={styles.applyText}>
        <Caps className={styles.eyebrow}>{t('partnership.enquireEyebrow')}</Caps>
        <h2 id="partnership-enquire" className={styles.applyTitle}>
          {t('partnership.enquireTitle')}
        </h2>
        <p className={styles.storyBody}>{t('partnership.enquireBody')}</p>
        <div className={styles.talk}>
          <p className={styles.storyBody}>{t('partnership.talkFirst')}</p>
          {wa || mail ? (
            <div className={styles.talkActions}>
              {wa && (
                <Button variant="secondary" size="small" href={wa}>
                  {t('partnership.ctaWhatsapp')}
                </Button>
              )}
              {mail && <CapsLink href={mail}>{t('partnership.ctaEmail')}</CapsLink>}
            </div>
          ) : (
            <p className={styles.note}>{t('partnership.contactMissing')}</p>
          )}
        </div>
      </div>
      <div className={styles.panel}>
        <PartnershipForm
          text={formText(t)}
          segments={segmentText(locale)}
          locale={locale}
          siteKey={turnstileSiteKey}
          privacyHref={siteHref('shop')('page', { slug: 'privacy' }, locale)}
        />
      </div>
    </section>
  )
}

/** The partner sign-in's words, resolved here: the form is a Client Component. */
function panelText(t: PartnershipText, contact: Props['contact']): PartnerPanelText {
  const ask = encodeURIComponent(t('partnership.signInForgotMessage'))
  const forgotHref = contact.whatsapp
    ? `https://wa.me/${contact.whatsapp.replace(/D/g, '')}?text=${ask}`
    : contact.email
      ? `mailto:${contact.email}?subject=${ask}`
      : '#enquire'
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
