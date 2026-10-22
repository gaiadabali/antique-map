/**
 * The reply links on a lead (TASKS.md 10.8.b; CONTENT-OPERATIONS.md §4.1 step 3): a `wa.me` link
 * with the lead's number and a short opening line, and a `mailto:` with the same. The line is in
 * the language the person wrote in (`payload.locale`, English when unknown), names the item they
 * asked about when there is one, and never mentions a price or a deal (AGENTS.md: the AI and the
 * site quote no antique's price; the owner does that, in the chat she opens from here).
 */
import type { Language } from './copy'

export type ReplyLead = {
  readonly site?: string | null
  readonly payload?: {
    readonly name?: string | null
    readonly whatsapp?: string | null
    readonly email?: string | null
    readonly locale?: string | null
  } | null
}

export type Reply = {
  readonly language: Language
  readonly whatsapp: string | null
  readonly mailto: string | null
}

/** The international format the form enforces (`collections/leads/index.ts`): `+`, then 7–15 digits. */
const WHATSAPP_NUMBER = /^\+[1-9]\d{6,14}$/
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

const BRAND: Record<string, string> = { gallery: 'Indies Gallery', shop: 'Old East Indies' }

/** The opening line, with the person's name and the item when there is one. */
export function openingLine(
  language: Language,
  site: string | null | undefined,
  name: string | null | undefined,
  itemTitle: string | null | undefined,
): string {
  const brand = BRAND[site ?? ''] ?? 'Indies'
  const who = name?.trim() ? ` ${name.trim()}` : ''
  const item = itemTitle?.trim() ?? ''
  if (language === 'id') {
    return item
      ? `Halo${who}, ini ${brand}. Terima kasih atas pertanyaan Anda tentang "${item}".`
      : `Halo${who}, ini ${brand}. Terima kasih telah menghubungi kami.`
  }
  return item
    ? `Hello${who}, this is ${brand}. Thank you for asking about "${item}".`
    : `Hello${who}, this is ${brand}. Thank you for getting in touch.`
}

export function buildReply(lead: ReplyLead, itemTitle: string | null | undefined): Reply {
  const contact = lead.payload ?? {}
  const language: Language = contact.locale === 'id' ? 'id' : 'en'
  const line = openingLine(language, lead.site, contact.name, itemTitle)
  const number = (contact.whatsapp ?? '').trim()
  const email = (contact.email ?? '').trim()
  const subject = itemTitle?.trim()
    ? `${BRAND[lead.site ?? ''] ?? 'Indies'}: ${itemTitle.trim()}`
    : (BRAND[lead.site ?? ''] ?? 'Indies')
  return {
    language,
    whatsapp: WHATSAPP_NUMBER.test(number)
      ? `https://wa.me/${number.slice(1)}?text=${encodeURIComponent(line)}`
      : null,
    mailto: EMAIL.test(email)
      ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${line}\n\n`)}`
      : null,
  }
}
