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
  'home.gallery.poster':
    'A still from the gallery film — shown here as a poster until the film loads',
  'home.gallery.trustCuratorTitle': 'Curator-certified',
  'home.gallery.trustCuratorBody': 'Every piece signed by Dr David E. Parry',
  'home.gallery.trustOriginalsTitle': 'Originals only',
  'home.gallery.trustOriginalsBody': 'Not one reproduction in the gallery',
  'home.gallery.trustMuseumsTitle': 'Museum-collected',
  'home.gallery.trustMuseumsBody': 'Singapore, Leiden and Louvre Abu Dhabi',
  'home.gallery.aboutEyebrow': 'About',
  'home.gallery.aboutLead':
    'Indies Gallery has bought and sold antique maps, prints, books and photographs of the East Indies for over twenty-five years. Our inventory runs past 9,500 authentic pieces, from the fifteenth century to the twentieth; 2,090 of them are listed online at any time.',
  'home.gallery.aboutBody':
    'Every object is offered with a certificate of authenticity from our curator, Dr David E. Parry, author of The Cartography of The East Indian Islands. Our clients include the National Museum of Singapore, the National Library of Australia, the Louvre Abu Dhabi and the University of Leiden — alongside collectors buying their first map.',
  'home.gallery.signalTrade': 'In the trade since',
  'home.gallery.signalTradeNote': '25 years',
  'home.gallery.signalHandled': 'Objects handled',
  'home.gallery.signalHandledNote': '9,500 authentic pieces',
  'home.gallery.signalHeld': 'Held by',
  'home.gallery.signalHeldNote': '4 national collections',
  'home.gallery.featuredEyebrow': 'The collection',
  'home.gallery.itemCta': 'Explore',
  'home.gallery.emptyTitle': 'The gallery is being stocked',
  'home.gallery.emptyBody': 'Our first pieces are being catalogued. Please look again soon.',
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
  'home.gallery.placesCta': 'Browse places',
  'home.gallery.enquireEyebrow': 'Enquire',
  'home.gallery.enquireTitle': 'Nothing here is sold online',
  'home.gallery.enquireBody':
    'Tell us which map interests you. We reply within two working days with its condition report, provenance and price — and, if you wish, arrange a private viewing.',
  'home.gallery.enquireCta': 'Enquire',
  'home.gallery.sellToUsCta': 'Sell to us',
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
