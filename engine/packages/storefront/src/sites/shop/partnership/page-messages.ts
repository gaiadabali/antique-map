/**
 * The partnership page's message keys and their neutral defaults (CONVENTIONS.md §6): the keys in
 * code, the values in `../lexicon/{en,id}.json`, joined with the shop's copy
 * through `createMessages()`.
 */
import { createMessages, defineMessages, type Messages } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'

export const PARTNERSHIP_MESSAGES = defineMessages({
  'partnership.eyebrow': 'Collaboration',
  'partnership.title': 'Buying for a shop, a hotel, or a company.',
  'partnership.lede':
    'More than 100 shops across Bali already stock Old East Indies. Whatever you are buying for, every piece is printed from antique originals we hold.',
  'partnership.ctaApply': 'Start an application',
  'partnership.signalShops': '100+ shops supplied',
  'partnership.resellerEyebrow': '01 · Resellers',
  'partnership.resellerTitle': 'Stock Old East Indies in your shop.',
  'partnership.resellerBody':
    'For galleries, gift shops, bookshops and hotel boutiques that want to stock Old East Indies. Tell us about your shop, and we will answer with pricing and terms.',
  'partnership.resellerCta': 'Apply as a reseller',
  'partnership.companyEyebrow': '02 · Company gifting',
  'partnership.companyTitle': 'A gift that carries a story, not a logo.',
  'partnership.companyBody':
    'For companies, hotels and villas: products made to order from our antique originals. Tell us what you have in mind, and we will answer with a quote.',
  'partnership.companyCta': 'Request a gifting quote',
  'partnership.enquireEyebrow': 'Apply',
  'partnership.enquireTitle': 'One form, whichever you are.',
  'partnership.enquireBody':
    'Choose Become a Retailer or Customised Wholesale Products, and we will only ask what matters for that.',
  'partnership.talkFirst': 'Prefer to talk first?',
  'partnership.talkWhatsapp': 'WhatsApp {number}',
  'partnership.talkWhatsappLabel': 'WhatsApp {number} (opens in a new tab)',
  'partnership.ctaEmail': 'Email us',
  'partnership.whatsappMessage':
    'Hello — I am buying for a shop, hotel or company and would like to know about your trade terms.',
  'partnership.emailSubject': 'Collaboration enquiry — Old East Indies',
  'partnership.emailBody':
    'Hello — I am buying for a shop, hotel or company. Please tell me about your trade terms.',
  'partnership.formEyebrow': 'Or write here',
  'partnership.formName': 'Your name',
  'partnership.formEmail': 'Email address',
  'partnership.formMessage': 'What are you buying for?',
  'partnership.formSubmit': 'Send enquiry',
  'partnership.formReplyNote': 'We will only write back about this enquiry — never anything more.',
  'partnership.contactMissing':
    'Contact details are being connected — they will appear here and in the footer.',
  'partnership.formWhatsapp': 'WhatsApp number',
  'partnership.formWhatsappHint': 'With the country code, for example +62 812 3456 7890.',
  'partnership.formContactNote': 'Give a WhatsApp number or an email address — one is enough.',
  'partnership.formSending': 'Sending…',
  'partnership.formSuccessTitle': 'Thank you — we have your enquiry.',
  'partnership.formSuccessBody': 'We will reply on WhatsApp or by email, whichever you gave us.',
  'partnership.formUnavailable':
    'The form is not available right now. Please write to us on WhatsApp or by email instead.',
  'partnership.formChecking': 'A short security check keeps this form free of spam.',
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
  'partnership.signInEyebrow': 'Already a partner',
  'partnership.signInTitle': 'Sign in to your prices.',
  'partnership.signInBody': 'Only approved reseller accounts can sign in here.',
  'partnership.signInEmail': 'Email address',
  'partnership.signInPassword': 'Password',
  'partnership.signInSubmit': 'Sign in',
  'partnership.signInSending': 'Signing in…',
  'partnership.signInForgot': 'Forgotten your password?',
  'partnership.signInForgotMessage': 'Hello, I have forgotten my Old East Indies partner password.',
  'partnership.signInMissing': 'Type your email address and your password.',
  'partnership.signInInvalid': 'That email and password do not match an approved partner account.',
  'partnership.signInLocked':
    'Too many wrong passwords: this account is locked for 15 minutes. Ask us if you need it sooner.',
  'partnership.signInRate':
    'Too many sign-in attempts from here. Please wait a while and try again.',
  'partnership.signInUnavailable':
    'Signing in is not available just now. Please try again in a moment.',
  'partnership.accountTitle': 'Welcome, {name}.',
  'partnership.accountBody':
    'You are signed in to your partner account. For an order today, write to us on WhatsApp or by email.',
  'partnership.accountEmail': 'Signed in as',
  'partnership.signOut': 'Sign out',
})

export type PartnershipMessageKey = keyof typeof PARTNERSHIP_MESSAGES

export type PartnershipText = Messages<PartnershipMessageKey>['t']

/** The partnership page's words for one locale, from the shop's lexicon. */
export function partnershipText(locale: SiteLocale): PartnershipText {
  const messages = createMessages({
    defaults: PARTNERSHIP_MESSAGES,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  return (key, params) => messages.t(key, params)
}
