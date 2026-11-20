/**
 * Which public link the panel's fixed "Talk to a person" action opens: WhatsApp first (the
 * visitors' usual channel), email when only that is set, nothing when neither is. A link outside the
 * handoff allowlist (AI.md §3.3) is never offered — the same check the stream's handoffs pass.
 */
import { isAllowedHandoffHref } from './chat-client'
import type { ChatContact } from './types'

export type TalkLink = { readonly href: string; readonly external: boolean }

export function talkToPersonLink(contact: ChatContact, origin: string): TalkLink | null {
  for (const href of [contact.whatsappHref, contact.emailHref]) {
    if (href !== null && isAllowedHandoffHref(href, origin)) {
      return { href, external: href.startsWith('https:') }
    }
  }
  return null
}
