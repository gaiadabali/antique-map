/**
 * The gallery home's message keys and their neutral defaults (CONVENTIONS.md §6): the keys in
 * code, the values in `../lexicon/{en,id}.json`. Joined with the site's copy through
 * `createMessages()`; a key the copy lacks shows the default and is recorded as missing.
 */
import { createMessages, defineMessages, type Messages } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'

export const HOME_MESSAGES = defineMessages({
  'home.gallery.eyebrow': 'Est. 2001 · Singapore',
  'home.gallery.title': 'The islands, first drawn.',
  'home.gallery.lede':
    'Original maps and engravings of the East Indies, 1550–1900, held in Singapore and offered with the curator’s certificate.',
  'home.gallery.heroCtaBrowse': 'Explore the collection',
  // The owner's facts (G7, G13): no institution is named (G10).
  'home.gallery.heroSince': 'Since 2001',
  'home.gallery.heroCount': 'Over 9,500 antiques',
  'home.gallery.heroCertificate': 'A certificate with every original',
  'home.gallery.aboutEyebrow': 'About',
  'home.gallery.aboutLead':
    'Maps, prints, books and photographs of the East Indies, bought and sold in Singapore.',
  'home.gallery.aboutTitle': 'Twenty-five years among the islands’ maps',
  'home.gallery.aboutBody':
    'Every original is offered with a certificate of authenticity from our curator, Dr David E. Parry, author of The Cartography of The East Indian Islands. Collectors come to us for a first map, and return for the rarer sheets.',
  'home.gallery.featuredEyebrow': 'The collection',
  'home.gallery.featuredTitle': 'Newly catalogued',
  'home.gallery.featuredCta': 'See the whole collection',
  'home.gallery.emptyTitle': 'The gallery is being stocked',
  'home.gallery.curatorEyebrow': 'The curator',
  'home.gallery.curatorTitle': 'Dr David E. Parry',
  'home.gallery.curatorBody':
    'He wrote the reference work on East Indies cartography. Every piece we sell passes his desk first — the plate identified, the state established, the condition recorded in plain words rather than a code.',
  'home.gallery.curatorBody2':
    'His signed certificate travels with the object, and stays with it through every owner that follows.',
  'home.gallery.curatorCta': 'Read his note',
  'home.gallery.curatorPoster': 'The curator at work',
  'home.gallery.makersTitle': 'Makers and places',
  'home.gallery.makersBody':
    'Follow the engravers, cartographers and photographers — or the places they drew.',
  'home.gallery.makersCta': 'Browse makers',
  'home.gallery.makersLine': 'The engravers, cartographers and photographers, one by one.',
  'home.gallery.placesCta': 'Browse places',
  'home.gallery.placesLine': 'The islands, ports and coasts they drew.',
  'home.gallery.enquireEyebrow': 'Enquire',
  'home.gallery.enquireTitle': 'Nothing here is sold online',
  'home.gallery.enquireBody':
    'Tell us which work interests you. We reply the same working day, Singapore time, with its condition report and provenance — and, if you wish, arrange a private viewing.',
  'home.gallery.enquireCta': 'Enquire',
  'home.gallery.sellToUsCta': 'Sell to us',
  'home.gallery.recentlyEyebrow': 'Archive',
  'home.gallery.recentlyTitle': 'Recently placed',
  'home.gallery.recentlyBody':
    'A few of the works that have left the gallery. We mark a work sold — never to whom, never for how much.',
  'home.gallery.liveEyebrow': 'Old East Indies',
  'home.gallery.liveTitle': 'Live with the collection',
  'home.gallery.liveBody':
    'Museum-grade reproductions of works like these, framed for a wall an original cannot hang on, at our sister shop.',
  'home.gallery.liveCta': 'Shop the prints',
})

export type HomeMessageKey = keyof typeof HOME_MESSAGES

export type HomeText = Messages<HomeMessageKey>['t']

/** The gallery home's words for one locale, from the gallery's lexicon. */
export function homeText(locale: SiteLocale): (key: HomeMessageKey) => string {
  const messages = createMessages({
    defaults: HOME_MESSAGES,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.gallery,
  })
  return (key) => messages.t(key)
}
