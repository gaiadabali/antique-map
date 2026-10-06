/**
 * The gallery contact area's message keys and neutral defaults (CONVENTIONS.md §6): the keys in
 * code, the values in `../lexicon/{en,id}.json`, joined with the gallery's copy through
 * `createMessages()`. The `lead.error.*` keys are the lead service's own (`server/leads/input`),
 * shown under their fields; the handoff message templates the EXPERIENCE-GALLERY.md §8 table
 * already names (`whatsapp.*`) are the app lexicon's, so this module adds only what no key
 * carries yet — the email subjects, the sell-to-us row and the two forms' words.
 */
import { createMessages, defineMessages, type MessageParams } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { lexiconMessages, type LexiconMessageKey } from '../../../messages/keys'
import { SITE_COPY } from '../../../shell/copy'

export const CONTACT_MESSAGES = defineMessages({
  // the item page's Ask panel (EXPERIENCE-GALLERY.md §5, §8)
  'item.askAnother': 'Ask for another example',
  'contactPage.emailLink': 'Email us',
  'contactPage.whatsappLink': 'WhatsApp us',
  'contactPage.emailOr': 'Or email',
  'contactPage.placeholder':
    'Our WhatsApp number and email address are being connected — please write to us from the Contact page soon.',
  // the email handoff's words beyond the templates the app lexicon names
  'email.itemSubject': '{stockNumber} — {title}',
  'email.questionLine': 'My question:',
  'email.viewingSubject': 'Viewing in {city}',
  'email.searchSubject': 'Looking for {query}',
  'email.sellSubject': 'Selling an antique',
  'contact.waText': 'Hello, I have a question for Indies Gallery.',
  'contact.emailSubject': 'A question for Indies Gallery',
  // the sell-to-us row of the §8 message table, and the page's words
  'whatsapp.sellUs':
    'Hello, I have an antique I would like to sell: {what}. I can send photos here.',
  'sellToUs.eyebrow': 'Sell to us',
  'sellToUs.title': 'Do you have an antique of the East Indies?',
  'sellToUs.lede':
    'We buy antique maps, prints, books and photographs of the region, singly or as a collection. Message us, write, or use the form below.',
  'sellToUs.whatButton': 'a map, print or photograph',
  'sellToUs.photosNote':
    'The form takes no photographs. Please send photos on WhatsApp or by email once we reply.',
  // the contact page's words (EXPERIENCE-GALLERY.md §2)
  'contact.eyebrow': 'Contact',
  'contact.title': 'Talk to the gallery',
  'contact.lede':
    'Ask about a work, arrange a viewing in Singapore or Jakarta, or tell us what you are looking for. We reply the same working day, Singapore time.',
  // the two forms' shared words (one field set, two kinds)
  'contactForm.eyebrow': 'Or write here',
  'contactForm.name': 'Your name',
  'contactForm.whatsapp': 'WhatsApp number',
  'contactForm.whatsappHint': 'With the country code, for example +62 812 3456 7890.',
  'contactForm.email': 'Email address',
  'contactForm.contactNote': 'Give a WhatsApp number or an email address — one is enough.',
  'contactForm.message': 'What would you like to ask?',
  'contactForm.messageSell': 'What do you have?',
  'contactForm.consent':
    'I agree that Indies Gallery may use these details to answer this enquiry, and keep them for up to 24 months after it is closed.',
  'contactForm.consentVersion': 'Consent text {version}',
  'contactForm.submit': 'Send message',
  'contactForm.sending': 'Sending…',
  'contactForm.securityCheck': 'A short security check keeps this form free of spam.',
  'contactForm.successTitle': 'Thank you — we have your message.',
  'contactForm.successBody':
    'We reply the same working day, Singapore time, on the WhatsApp number or email you gave.',
  'contactForm.unavailable':
    'The form is not available right now. Please write to us on WhatsApp or by email instead.',
  // the lead service's field errors, by lexicon key (`server/leads/input`)
  'lead.error.name': 'Please tell us your name.',
  'lead.error.message': 'Please write a message of up to 2,000 characters.',
  'lead.error.contact': 'Please give a WhatsApp number or an email address.',
  'lead.error.whatsapp': 'Use the international form, for example +62 812 3456 7890.',
  'lead.error.email': 'This email address does not look right.',
  'lead.error.consent': 'Please tick the box so we may answer you.',
  'lead.error.invalid': 'Something in the form is not right. Please check it and try again.',
  'lead.error.challenge': 'The security check did not pass. Please try again.',
  'lead.error.rate': 'Too many enquiries just now. Please wait a minute and try again.',
  'lead.error.unavailable':
    'We could not save your enquiry. Please try again, or write to us on WhatsApp or by email.',
})

export type ContactMessageKey = keyof typeof CONTACT_MESSAGES

/** The contact area's words: this module's keys and the shared lexicon's (`whatsapp.*`). */
export type ContactText = (
  key: ContactMessageKey | LexiconMessageKey,
  params?: MessageParams,
) => string

const isKnown = (key: string): boolean => CONTACT_MESSAGES[key as ContactMessageKey] !== undefined

/** The contact area's words for one locale: this module's keys plus the shared lexicon's (`whatsapp.*`). */
export function contactText(locale: SiteLocale): ContactText {
  const mine = createMessages({
    defaults: CONTACT_MESSAGES,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.gallery,
  })
  const shared = lexiconMessages('gallery', locale)
  return ((key: string, params?: MessageParams) =>
    isKnown(key)
      ? mine.t(key as ContactMessageKey, params)
      : shared.t(key as LexiconMessageKey, params)) as ContactText
}
