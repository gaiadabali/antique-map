/**
 * The partnership page's first content, seeded once into the CMS (`../pages`) and never drawn by
 * the site itself (TASKS.md 27.5.b): the redesign of 2026-10-20's sections, in order, with the
 * lexicon's words. Since the owner's feedback of 2026-11-19 (TASKS.md 28.2, F3): two offers —
 * become a retailer, customised wholesale products — each leading to the one enquiry, and no link
 * to the partners' sign-in, which stays at the foot of the page for existing accounts.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { BlockLink, OfferVM, ShopBlockVM } from '../../blocks'
import {
  partnershipText,
  type PartnershipMessageKey as Key,
} from '../../../../../sites/shop/partnership/page-messages'

/**
 * The two offers, with no terms: the minimums, lead times and services the first content listed
 * were never the owner's (the GM's review of 2026-11-24). The CMS keeps a terms list on each offer
 * for the owner to fill.
 */
const OFFERS = ['reseller', 'company'] as const

export function defaultPartnershipBlocks(locale: SiteLocale): readonly ShopBlockVM[] {
  const t = partnershipText(locale)
  const toSection = (section: string, label: Key): BlockLink => ({
    label: t(label),
    href: `#${section}`,
    external: false,
  })
  const offers: OfferVM[] = OFFERS.map((offer, index) => ({
    type: 'offer',
    id: `partnership-${offer}`,
    anchor: offer,
    eyebrow: t(`partnership.${offer}Eyebrow`),
    title: t(`partnership.${offer}Title`),
    body: t(`partnership.${offer}Body`),
    terms: [],
    link: toSection('apply', `partnership.${offer}Cta`),
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
      secondary: null,
    },
    {
      type: 'factStrip',
      id: 'partnership-facts',
      facts: [t('partnership.signalShops')],
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
