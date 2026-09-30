/**
 * Prefilled WhatsApp messages (the buyer’s draft, in the page’s language) and the notes a loader
 * sends as a `MessageVM`, read as `message.<code>`.
 * Keys and neutral defaults only — the words are the brand’s (`../keys.ts`).
 */
import { defineMessages } from '@engine/i18n'

export const WHATSAPP_AND_NOTE_KEYS = defineMessages({
  // prefilled WhatsApp messages (Requirement 6.7; EXPERIENCE-SHOP.md §8)
  'whatsapp.item': 'Hello, I am interested in {stockNumber} — {title}. {url}',
  'whatsapp.soldItem':
    'Hello, I saw {stockNumber} — {title} has sold. Is another example available? {url}',
  'whatsapp.viewing': 'Hello, I would like to arrange a viewing of {stockNumber} — {title}.',
  'whatsapp.search': 'Hello, I am looking for {query}.',
  'whatsapp.order': 'Hello, I have a question about order {number}.',
  'whatsapp.paymentHelp': 'Hello, I need help paying for order {number}.',
  'whatsapp.payLinkExpired':
    'Hello, my payment link for {title} has expired. Could you send a new one?',
  'whatsapp.error': 'Hello, your site showed an error. Reference: {reference}.',
  'whatsapp.cta': 'Message us on WhatsApp',
  'whatsapp.replyHours': 'Replies {hours}',
  // reply times and receipts (MessageVM codes; the figures are data — G9, S6)
  'message.replyWithinHours': 'We reply within {hours} hours.',
  'message.replyWithinDays': 'We reply within {days} days.',
  'message.holdReplyWithinHours': 'We confirm holds within {hours} hours.',
  'message.quoteReplyWithinDays': 'Your quote follows within {days} days.',
  'message.quoteBeingPrepared': 'Your quote is being prepared: within {days} days.',
  'message.heldByAnotherMeanwhile': 'Another buyer has taken a hold on this work meanwhile.',
  'message.resetLinkSent': 'If that address has an account, a link is on its way.',
  'message.packedWithin': 'Packed within {days} days',
  'message.shipsFrom': 'Ships from {city}',
  'message.dutiesOnDelivery': 'Import duties are paid on arrival.',
  // order next steps (MessageVM codes)
  'message.trackingByEmail': 'Tracking details follow by email.',
  'message.payWithinCountdown': 'Pay before the countdown ends.',
  'message.whatsappWhenPaid': 'We will message you when the payment arrives.',
  'message.bagKept': 'Your cart is kept.',
  'message.bringPickupCode': 'Bring your pickup code when you collect.',
  'message.paymentBeforeCompletion':
    'Payment must be received and confirmed before an order is complete.',
  'message.bankDetailsOnPdfOnly': 'Bank details appear on the PDF only.',
  // want-lists, wishlists and listings (MessageVM codes)
  'message.wantListByEmail': 'Alerts come by email. No account needed.',
  'message.wantListConfirmSent':
    'If this address can receive alerts, a confirmation email is on its way.',
  'message.wantListConfirmed': 'Your alert is on.',
  'message.wantListStopped': 'This alert is stopped. No more emails will come from it.',
  'message.wantListLinkExpired': 'This link has expired. Set up the alert again to get a new one.',
  'message.notAllOnline': 'Not all {held} works we hold are online. Ask us.',
  'message.available.one': '{count} available',
  'message.available.other': '{count} available',
  'message.works.one': '{count} work',
  'message.works.other': '{count} works',
  'message.lifeDates': '{born}–{died}',
})
