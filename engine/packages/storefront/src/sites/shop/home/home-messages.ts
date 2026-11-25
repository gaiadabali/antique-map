/**
 * The shop home's message keys and their neutral defaults (CONVENTIONS.md §6): the keys in code,
 * the values in `../lexicon/{en,id}.json`. Joined with the site's copy through `createMessages()`.
 */
import { createMessages, defineMessages, type Messages } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'

export const HOME_MESSAGES = defineMessages({
  'home.shop.eyebrow': 'Art souvenirs of the East Indies',
  'home.shop.title': 'The old Indies, on your walls.',
  'home.shop.lede':
    'Prints of antique maps and engravings, made from originals in our own collection.',
  'home.shop.ctaShop': 'Shop prints',
  'home.shop.ctaProcess': 'How we make them',
  'home.shop.heroA': 'The lead print — shown here as a placeholder until its photograph loads',
  'home.shop.signalBali': 'Printed in Bali',
  'home.shop.signalShops': 'Stocked in 100+ shops',
  'home.shop.pricePrefix': 'From',
  'home.shop.processTitle': 'From an original in our hands to a print on your wall',
  'home.shop.processStep1Title': 'It starts with an original',
  'home.shop.processStep1Body':
    'Not a file from the internet — an antique map or engraving we physically hold.',
  'home.shop.processStep3Title': 'Printed in Bali',
  'home.shop.processStep3Body': 'Every print is made in Bali and sent from Bali.',
  'home.shop.tradeTitle': 'For shops, hotels and companies',
  'home.shop.tradeLead': 'More than 100 shops across Bali already stock Old East Indies.',
  'home.shop.tradeBodyMore':
    'We also make custom gifts for hotels and corporate orders — Bali-themed, printed from the antique originals we hold.',
  'home.shop.tradeCta': 'See collaboration options',
  'home.shop.tradeFact1': '100+ shops supplied',
  'home.shop.tradeFact3': 'Custom gifts for hotels and companies',
  'home.shop.originalsTitle': 'Every print begins with a map we hold',
  'home.shop.originalsBody':
    'Those originals are offered to collectors at Antique Maps Indonesia — our sister gallery.',
  'home.shop.originalsCta': 'See the originals',
  'home.shop.originalsLabel': 'Antique Maps Indonesia',
  'home.shop.railPrevious': 'Previous',
  'home.shop.railNext': 'Next',
  'home.shop.chipsEyebrow': 'Shop by',
  'home.shop.setsCta': 'See the gallery walls',
})

export type HomeMessageKey = keyof typeof HOME_MESSAGES

export type HomeText = Messages<HomeMessageKey>['t']

/** The shop home's words for one locale, from the shop's lexicon. */
export function homeText(locale: SiteLocale): (key: HomeMessageKey) => string {
  const messages = createMessages({
    defaults: HOME_MESSAGES,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  return (key) => messages.t(key)
}
