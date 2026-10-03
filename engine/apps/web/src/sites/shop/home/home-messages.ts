/**
 * The shop home's message keys and their neutral defaults (CONVENTIONS.md §6): the keys in code,
 * the values in `../lexicon/{en,id}.json`. Joined with the site's copy through `createMessages()`.
 */
import { createMessages, defineMessages, type Messages } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'

export const HOME_MESSAGES = defineMessages({
  'home.shop.eyebrow': 'Art souvenirs of the East Indies',
  'home.shop.title': 'Old maps, new walls.',
  'home.shop.lede':
    'Museum-grade prints of antique maps and engravings, made from originals in our own collection. 300gsm cotton, archival inks.',
  'home.shop.ctaShop': 'Shop prints',
  'home.shop.ctaProcess': 'How we make them',
  'home.shop.heroA': 'The lead print — shown here as a placeholder until its photograph loads',
  'home.shop.heroB': 'A print on a wall — placeholder',
  'home.shop.featuredEyebrow': 'Best sellers',
  'home.shop.pricePrefix': 'From',
  'home.shop.shopAll': 'Shop all prints',
  'home.shop.emptyTitle': 'The shop is being stocked',
  'home.shop.emptyBody':
    'Our first prints are being photographed and priced. Please look again soon.',
  'home.shop.processEyebrow': 'How we make them',
  'home.shop.processTitle': 'From an original in our hands to a print on your wall',
  'home.shop.processStep1Title': 'It starts with an original',
  'home.shop.processStep1Body':
    'Not a file from the internet — an antique map or engraving we physically hold, the same ones our curator certifies.',
  'home.shop.processStep2Title': 'Restored by hand, scars kept',
  'home.shop.processStep2Body':
    'We correct foxing, tears and fading. The marks that give a map its character stay — they are part of its story.',
  'home.shop.processStep3Title': 'Printed in our own workshop',
  'home.shop.processStep3Body':
    '300gsm cotton and archival pigment inks, printed in Bali. Not outsourced, not print-on-demand.',
  'home.shop.posterWorkshop': 'The workshop — press, paper, inks (placeholder)',
  'home.shop.tradeEyebrow': 'Trade & gifting',
  'home.shop.tradeTitle': 'For shops, hotels and companies',
  'home.shop.tradeBody':
    'More than 100 shops across Indonesia already stock Old East Indies. We also make custom gifts for hotels and corporate orders — Bali-themed, printed from the antique originals we hold.',
  'home.shop.tradeCta': 'See partnership options',
  'home.shop.originalsEyebrow': 'The originals',
  'home.shop.originalsTitle': 'Every print begins with a map we hold',
  'home.shop.originalsBody':
    'Those originals are examined and certified by our curator, and offered to collectors at Antique Maps Indonesia — our sister gallery.',
  'home.shop.originalsCta': 'See the originals',
  'home.shop.posterOriginal': 'An original, beside its print (placeholder)',
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
