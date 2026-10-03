/**
 * The partnership page's message keys and their neutral defaults (CONVENTIONS.md §6): the keys in
 * code, the values in `../../../../sites/shop/lexicon/{en,id}.json`, joined with the shop's copy
 * through `createMessages()`.
 */
import { createMessages, defineMessages, type Messages } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../../../shell/copy'

export const PARTNERSHIP_MESSAGES = defineMessages({
  'partnership.eyebrow': 'Partnership',
  'partnership.title': 'Buying for a shop, a hotel, or a company.',
  'partnership.lede':
    'More than 100 shops across Indonesia already stock Old East Indies. Whatever you are buying for, every piece is printed in our own workshop from antique originals we hold.',
  'partnership.ctaApply': 'Start an application',
  'partnership.signalShops': '100+ shops supplied',
  'partnership.signalWorkshop': 'Printed in our own workshop',
  'partnership.signalPaper': '300gsm cotton · archival inks',
  'partnership.signalShipping': 'Shipping across Indonesia & worldwide',
  'partnership.resellerEyebrow': '01 · Resellers',
  'partnership.resellerTitle': 'Stock Old East Indies in your shop.',
  'partnership.resellerBody':
    'For galleries, gift shops, bookshops and hotel boutiques. Once your application is approved, your wholesale pricing and reorder terms are agreed directly with our trade desk.',
  'partnership.resellerPricing': 'Wholesale tiers, agreed with our trade desk',
  'partnership.resellerMinimum': '20 pieces per design, mixed sizes allowed',
  'partnership.resellerReorder': 'One click from your order history',
  'partnership.resellerDisplay': 'Counter stands and signage, on request',
  'partnership.resellerCta': 'Apply as a reseller',
  'partnership.posterReseller': 'Shop display — placeholder',
  'partnership.companyEyebrow': '02 · Company gifting',
  'partnership.companyTitle': 'A gift that carries a story, not a logo.',
  'partnership.companyBody':
    'For client gifts, anniversaries and conference welcome packs. We can print a map of the city your office sits in, add a discreet mark, and finish each piece in your own packaging.',
  'partnership.companyCustom': 'Choose the map, the size, the frame and the box',
  'partnership.companyBranding': 'Embossed card or engraved plate, never printed over the artwork',
  'partnership.companyQuantity': 'From 25 pieces',
  'partnership.companyLeadTime': 'Three to four weeks, including a sample',
  'partnership.companyCta': 'Request a gifting quote',
  'partnership.posterCompany': 'Corporate gift set — placeholder',
  'partnership.hotelEyebrow': '03 · Hotels & villas',
  'partnership.hotelTitle': 'Bali on the wall, not a postcard of it.',
  'partnership.hotelBody':
    'For hotels, villas and restaurants that want art with a reason to be there. Antique charts of Bali, botanical studies of local spice, and views of the islands as travellers first saw them — sized for corridors, suites and lobbies.',
  'partnership.hotelThemed': 'Curated to your island, your period, your palette',
  'partnership.hotelSizes': 'Up to 120 cm, framed and ready to hang',
  'partnership.hotelRepeat': 'We hold your specification for future rooms',
  'partnership.hotelSample': 'One piece sent before you commit',
  'partnership.hotelCta': 'Request hotel samples',
  'partnership.posterHotel': 'Hotel interior — placeholder',
  'partnership.enquireEyebrow': 'Get in touch',
  'partnership.enquireTitle': 'Tell us what you are buying for.',
  'partnership.enquireBody':
    'Write, or send the form, and our trade desk replies within two working days with wholesale terms for resellers, gifting quotes for companies, and samples for hotels and villas.',
  'partnership.talkFirst': 'Prefer to talk first?',
  'partnership.ctaWhatsapp': 'WhatsApp us',
  'partnership.ctaEmail': 'Email us',
  'partnership.whatsappMessage':
    'Hello — I am buying for a shop, hotel or company and would like to know about your trade terms.',
  'partnership.emailSubject': 'Partnership enquiry — Old East Indies',
  'partnership.emailBody':
    'Hello — I am buying for a shop, hotel or company. Please tell me about your trade terms.',
  'partnership.formEyebrow': 'Or write here',
  'partnership.formName': 'Your name',
  'partnership.formEmail': 'Email address',
  'partnership.formMessage': 'What are you buying for?',
  'partnership.formSubmit': 'Send enquiry',
  'partnership.formReplyNote':
    'Answered within two working days. We will only write back about this enquiry — never anything more.',
  'partnership.contactMissing':
    'Contact details are being connected — they will appear here and in the footer.',
  'partnership.labelPricing': 'Pricing',
  'partnership.labelMinimum': 'Minimum',
  'partnership.labelReorder': 'Reorder',
  'partnership.labelDisplay': 'Display',
  'partnership.labelCustom': 'Custom',
  'partnership.labelBranding': 'Branding',
  'partnership.labelQuantity': 'Quantity',
  'partnership.labelLeadTime': 'Lead time',
  'partnership.labelThemed': 'Themed',
  'partnership.labelSizes': 'Sizes',
  'partnership.labelRepeat': 'Repeat',
  'partnership.labelSample': 'Sample',
})

export type PartnershipMessageKey = keyof typeof PARTNERSHIP_MESSAGES

export type PartnershipText = Messages<PartnershipMessageKey>['t']

/** The partnership page's words for one locale, from the shop's lexicon. */
export function partnershipText(locale: SiteLocale): (key: PartnershipMessageKey) => string {
  const messages = createMessages({
    defaults: PARTNERSHIP_MESSAGES,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  return (key) => messages.t(key)
}
