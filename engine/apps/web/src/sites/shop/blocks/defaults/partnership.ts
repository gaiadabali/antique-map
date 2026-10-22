/**
 * The partnership page as it reads before the CMS holds a published `partnership` page: the
 * redesign of 2026-10-20's sections, in order, with the lexicon's words.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { BlockLink, OfferVM, ShopBlockVM } from '../../../../server/shop/pages/blocks'
import { partnershipText, type PartnershipMessageKey as Key } from '../../partnership/page-messages'

type OfferKeys = {
  readonly id: 'reseller' | 'company' | 'hotel'
  readonly terms: readonly (readonly [Key, Key])[]
}

const OFFERS: readonly OfferKeys[] = [
  {
    id: 'reseller',
    terms: [
      ['partnership.labelPricing', 'partnership.resellerPricing'],
      ['partnership.labelMinimum', 'partnership.resellerMinimum'],
      ['partnership.labelReorder', 'partnership.resellerReorder'],
      ['partnership.labelDisplay', 'partnership.resellerDisplay'],
    ],
  },
  {
    id: 'company',
    terms: [
      ['partnership.labelCustom', 'partnership.companyCustom'],
      ['partnership.labelBranding', 'partnership.companyBranding'],
      ['partnership.labelQuantity', 'partnership.companyQuantity'],
      ['partnership.labelLeadTime', 'partnership.companyLeadTime'],
    ],
  },
  {
    id: 'hotel',
    terms: [
      ['partnership.labelThemed', 'partnership.hotelThemed'],
      ['partnership.labelSizes', 'partnership.hotelSizes'],
      ['partnership.labelRepeat', 'partnership.hotelRepeat'],
      ['partnership.labelSample', 'partnership.hotelSample'],
    ],
  },
]

export function defaultPartnershipBlocks(locale: SiteLocale): readonly ShopBlockVM[] {
  const t = partnershipText(locale)
  const toSection = (section: string, label: Key): BlockLink => ({
    label: t(label),
    href: `#${section}`,
    external: false,
  })
  const offers: OfferVM[] = OFFERS.map((offer, index) => ({
    type: 'offer',
    id: `partnership-${offer.id}`,
    anchor: offer.id,
    eyebrow: t(`partnership.${offer.id}Eyebrow`),
    title: t(`partnership.${offer.id}Title`),
    body: t(`partnership.${offer.id}Body`),
    terms: offer.terms.map(([label, value]) => ({ label: t(label), value: t(value) })),
    link: toSection('apply', `partnership.${offer.id}Cta`),
    warm: index === 1,
  }))
  return [
    {
      type: 'pageHero',
      id: 'partnership-hero',
      eyebrow: t('partnership.eyebrow'),
      title: t('partnership.title'),
      lede: t('partnership.lede'),
      primary: toSection('apply', 'partnership.ctaApply'),
      secondary: toSection('signin', 'partnership.signInLink'),
    },
    {
      type: 'factStrip',
      id: 'partnership-facts',
      facts: [
        t('partnership.signalShops'),
        t('partnership.signalWorkshop'),
        t('partnership.signalPaper'),
        t('partnership.signalShipping'),
      ],
    },
    ...offers,
    {
      type: 'enquiry',
      id: 'partnership-apply',
      anchor: 'apply',
      eyebrow: t('partnership.enquireEyebrow'),
      title: t('partnership.enquireTitle'),
      body: t('partnership.enquireBody'),
      talkFirst: t('partnership.talkFirst'),
      whatsappMessage: t('partnership.whatsappMessage'),
    },
    {
      type: 'partnerSignIn',
      id: 'partnership-signin',
      eyebrow: t('partnership.signInEyebrow'),
      title: t('partnership.signInTitle'),
      body: t('partnership.signInBody'),
    },
  ]
}
