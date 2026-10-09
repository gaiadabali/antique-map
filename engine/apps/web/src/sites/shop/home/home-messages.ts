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
  'home.shop.signalRestored': 'Restored by hand',
  'home.shop.signalBali': 'Printed in Bali',
  'home.shop.signalShops': 'Stocked in 100+ shops',
  'home.shop.featuredEyebrow': 'Best sellers',
  'home.shop.featuredTitle': 'Begin with these',
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
  'home.shop.tradeFact1': '100+ shops supplied',
  'home.shop.tradeFact2': 'Printed in our own workshop',
  'home.shop.tradeFact3': 'Custom gifts for hotels and companies',
  'home.shop.originalsEyebrow': 'The originals',
  'home.shop.originalsTitle': 'Every print begins with a map we hold',
  'home.shop.originalsBody':
    'Those originals are examined and certified by our curator, and offered to collectors at Antique Maps Indonesia — our sister gallery.',
  'home.shop.originalsCta': 'See the originals',
  'home.shop.posterOriginal': 'An original, beside its print (placeholder)',
  // Browse has no island or room facet yet (qa 4.qa, finding F4); every chip links to the shop
  // until one does. The names are placeholder until the owner's content.
  'home.shop.chipsEyebrow': 'Shop by',
  'home.shop.chipIslandBali': 'Bali',
  'home.shop.chipIslandJava': 'Java',
  'home.shop.chipIslandSumatra': 'Sumatra',
  'home.shop.chipIslandLombok': 'Lombok',
  'home.shop.chipRoomLivingRoom': 'Living room',
  'home.shop.chipRoomBedroom': 'Bedroom',
  'home.shop.chipRoomOffice': 'Office',
  'home.shop.chipRoomEntryway': 'Entryway',
  // "Sets that hang together" needs the collections surface (TASKS.md, phase 6); these three
  // stand in until it ships, placeholder until the owner's content.
  'home.shop.setsEyebrow': 'Gallery walls',
  'home.shop.setsTitle': 'Sets that hang together',
  'home.shop.setsBody':
    'Prints we have paired so the sizes and subjects sit well on one wall — framed and hung as shown, or chosen apart.',
  'home.shop.set1Title': 'The spice route',
  'home.shop.set1Body': 'Three sea charts of the Moluccas and the Banda Islands.',
  'home.shop.set2Title': 'Batavia, three views',
  'home.shop.set2Body': 'The old city from the roadstead, the castle and the canal.',
  'home.shop.set3Title': 'Java, north coast',
  'home.shop.set3Body': 'Three coastal charts, from Batavia to Surabaya.',
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
