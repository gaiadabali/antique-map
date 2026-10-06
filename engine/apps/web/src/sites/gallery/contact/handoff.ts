/**
 * The gallery's handoff builder (5.3.a; EXPERIENCE-GALLERY.md §8): the `wa.me` and `mailto:`
 * links that open a prepared message in the page's language, written in the visitor's voice,
 * which they edit before sending. The templates are lexicon keys; the stock number always comes
 * first, the title is cut at 90 characters with "…", and `{url}` is the item's clean canonical
 * URL in the page's locale (the page builds it) so WhatsApp shows its link preview.
 *
 * Pure: no server-only, no request. The contact values come from `loadSiteSettings()`; when the
 * gallery's number or address has not arrived yet (OA2), the link is `null` and the page links
 * the Contact page with a placeholder notice instead — never a fake number.
 */
import type { MessageParams } from '@engine/i18n'

import type { ContactMessageKey } from './messages'

/** The words a builder needs: the contact area's message function. */
export type HandoffText = (key: ContactMessageKey, params?: MessageParams) => string

/** The gallery's public contact, from `loadSiteSettings()`'s read. */
export type ContactChannels = {
  readonly whatsapp: string | null
  readonly email: string | null
}

/** The gallery's contact page, when the builder has no channel to offer (OA2 pending). */
export type Handoff = {
  readonly wa: string | null
  readonly mail: string | null
}

/** A title over the limit is cut, ending in "…", so the message keeps its URL readable. */
export const TITLE_MAX = 90

/** The title as the message says it: whole when it fits, else cut at 90 characters with "…". */
export function cutTitle(title: string, max: number = TITLE_MAX): string {
  return title.length <= max ? title : `${title.slice(0, max - 1).trimEnd()}…`
}

/** `wa.me`'s address: the number's digits alone, the message in the query. */
export function whatsappHref(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}

/** `mailto:`'s address: the subject and the body, each encoded (a `&` or `#` in either stays). */
export function mailtoHref(address: string, subject: string, body: string): string {
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** One row's message: what WhatsApp carries, and the email's subject and body. */
export type HandoffMessage = {
  readonly waText: string
  readonly subject: string
  readonly body: string
}

/** Item, available or on hold (§8 row 1): subject "{stockNumber} — {title}", body the same plus an empty "My question:" line. */
export function itemMessage(
  t: HandoffText,
  item: { stockNumber: string; title: string; url: string },
): HandoffMessage {
  const filled = { stockNumber: item.stockNumber, title: cutTitle(item.title), url: item.url }
  const waText = t('whatsapp.item', filled)
  return {
    waText,
    subject: t('email.itemSubject', filled),
    body: `${waText}\n\n${t('email.questionLine')}`,
  }
}

/** Item, sold (§8 row 2): "…has sold. Do you have another example?" — the email pattern is the same. */
export function soldMessage(
  t: HandoffText,
  item: { stockNumber: string; title: string; url: string },
): HandoffMessage {
  const filled = { stockNumber: item.stockNumber, title: cutTitle(item.title), url: item.url }
  const waText = t('whatsapp.soldItem', filled)
  return {
    waText,
    subject: t('email.itemSubject', filled),
    body: `${waText}\n\n${t('email.questionLine')}`,
  }
}

/** Viewing (§8 row 3): the subject names the city. */
export function viewingMessage(
  t: HandoffText,
  item: { stockNumber: string; title: string; city: string },
): HandoffMessage {
  const waText = t('whatsapp.viewing', {
    stockNumber: item.stockNumber,
    title: cutTitle(item.title),
  })
  return { waText, subject: t('email.viewingSubject', { city: item.city }), body: waText }
}

/** No results (§8 row 4): the query is what the visitor was looking for. */
export function noResultsMessage(t: HandoffText, query: string): HandoffMessage {
  const waText = t('whatsapp.search', { query })
  return { waText, subject: t('email.searchSubject', { query }), body: waText }
}

/** Sell to us (§8 row 5): what they have, and the promise that photos can follow. */
export function sellMessage(t: HandoffText, what: string): HandoffMessage {
  const waText = t('whatsapp.sellUs', { what })
  return { waText, subject: t('email.sellSubject'), body: waText }
}

/** The two links, or `null` each where the gallery's channel has not arrived yet (OA2). */
export function talkLinks(contact: ContactChannels, message: HandoffMessage): Handoff {
  return {
    wa: contact.whatsapp ? whatsappHref(contact.whatsapp, message.waText) : null,
    mail: contact.email ? mailtoHref(contact.email, message.subject, message.body) : null,
  }
}
