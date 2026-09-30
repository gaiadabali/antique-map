/**
 * Forms and their results, the conversations (price, offer, hold, viewing, quote), alerts, saved
 * items, empty states, errors and sign-in.
 * Keys and neutral defaults only — the words are the brand’s (`../keys.ts`).
 */
import { defineMessages } from '@engine/i18n'

export const CONVERSATION_KEYS = defineMessages({
  // form results and field errors (C2 FormResultVM, C6 FieldError.reason)
  'form.received': 'Thank you — your message was received.',
  'form.rateLimited': 'Too many attempts. Try again in {minutes} minutes.',
  'form.invalid': 'Check the highlighted fields.',
  'form.optional': '(optional)',
  'field.required': 'Fill in {field}.',
  'field.format': '{field} does not look right. Check it.',
  'field.too-long': '{field} is too long. Shorten it.',
  'field.not-allowed': '{field} cannot be used here.',
  'field.mismatch': '{field} does not match.',
  'field.limit': '{field} is over the limit.',
  'field.out-of-range': '{field} is outside the allowed range.',
  'consent.marketingEmail': 'Send me news by email (optional)',
  'consent.marketingWhatsapp': 'Send me news on WhatsApp (optional)',
  'enquiry.title': 'Ask us',
  'enquiry.message': 'Your question',
  'enquiry.submit': 'Send question',
  // quotes and proformas (C6 QuoteView; COMMERCE.md §7)
  'quote.validUntil': 'Valid until {date}',
  'quote.downloadPdf': 'Download PDF',
  'quote.accept': 'Accept quote',
  'quote.expired': 'This quote has expired. Ask for a new one.',
  'quote.lineRemoved': '{title} was removed: {reason}',
  'quote.status.requested': 'Being prepared',
  'quote.status.issued': 'Ready',
  'quote.status.accepted': 'Accepted',
  'quote.status.paid': 'Paid',
  'quote.status.expired': 'Expired',
  'quote.status.cancelled': 'Cancelled',
  'quote.tradePrice': 'Your price {trade} · list price {list}',
  'quote.belowMinimum': 'Below the minimum order of {amount}: add {remaining}.',
  // want-lists and alerts (C6 wantList.*, D39)
  'wantList.title': 'Get an email alert',
  'wantList.email': 'Your email',
  'wantList.frequency.instant': 'As soon as something matches',
  'wantList.frequency.daily': 'Once a day, as a digest',
  'wantList.submit': 'Save alert',
  'wantList.confirm': 'Confirm this alert',
  'wantList.stop': 'Stop this alert',
  'wantList.status.pending': 'Waiting for confirmation',
  'wantList.status.active': 'Active',
  'wantList.gone': 'This alert has already been stopped.',
  'wantList.forListing': 'Alert me about new arrivals in {label}',
  // wishlists: the gallery's in the account, the shop's on the device (D35)
  'wishlist.title': 'Saved',
  'wishlist.empty': 'Nothing saved yet. Tap the heart to keep something here.',
  'wishlist.emptyElsewhere': 'Saved items stay in the browser where you saved them.',
  'wishlist.removedProduct': '{title} is no longer available and left your list.',
  'wishlist.saved': 'Saved {title}',
  'wishlist.removed': 'Removed {title}',
  // empty states (an empty band is omitted; these are the pages that must say something)
  'empty.search': 'Nothing matches “{query}”.',
  'empty.didYouMean': 'Did you mean {suggestion}?',
  'empty.askUs': 'Ask us about “{query}”',
  'empty.filters': 'Nothing matches these filters. Remove one to see more.',
  'empty.orders': 'No orders yet.',
  'empty.wantLists': 'No alerts yet.',
  'empty.quotes': 'No quotes yet.',
  // errors and removed pages (C2 GoneVM, ErrorVM; notFound.* is the shell's)
  'notFound.searchFor': 'Search for “{query}”',
  'gone.title': 'This is no longer offered',
  'gone.body': 'It has been withdrawn. Here are similar ones.',
  'error.title': 'Something went wrong on our side',
  'error.body': 'Try again soon. If it continues, message us with reference {reference}.',
  'error.retry': 'Try again',
  'checkout.problem.price-changed':
    'The total changed: it is now {total}. Check it before you pay.',
  'checkout.problem.expired.cart': 'Your checkout timed out. Start again from your cart.',
  'checkout.problem.expired.item': 'Your checkout timed out. Start again from the item.',
  'checkout.problem.expired.link': 'This link has timed out. Ask us for a new one.',
  'checkout.problem.not-found': 'We cannot find that. The link may be out of date.',
  'checkout.problem.not-offered': 'That is not offered here.',
  // sign-in (C2 SignInErrorVM): buyers on the gallery, partners on the shop
  'signIn.invalid': 'That email and password do not match.',
  'signIn.locked': 'Too many attempts. Try again in {minutes} minutes.',
  'signIn.forgot': 'Forgot password',
})
