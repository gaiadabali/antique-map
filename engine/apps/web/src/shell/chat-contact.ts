/**
 * The chat panel's "Talk to a person" links, built on the server from the same public contact
 * fields the footer shows (`site-settings`, read by `loadSiteSettings`): WhatsApp as a `wa.me` link
 * and email as `mailto:`, each null when the owner has not set it. Nothing internal is read here.
 */
import type { ChatContact } from '../shared/chat/types'
import type { PublicSiteSettings } from '../server/site-settings'

export function chatContact(contact: PublicSiteSettings['contact']): ChatContact {
  const digits = (contact.whatsapp ?? '').replace(/\D/g, '')
  const email = (contact.email ?? '').trim()
  return {
    whatsappHref: digits === '' ? null : `https://wa.me/${digits}`,
    emailHref: email === '' ? null : `mailto:${email}`,
  }
}
