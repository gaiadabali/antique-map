/**
 * The handoff link (AI.md §2.4): built by the server, never written by the model. The number or
 * address comes from `site-settings`, the template from the chat's lexicon in the visitor's
 * locale, and the items from the published projection — each item's title, stock number or SKU
 * and public URL, which WhatsApp previews with the page's image (a link cannot attach a file).
 * The visitor's summary has its URLs, contact details and (on the gallery) amounts removed.
 */
import 'server-only'

import type { ChatCopy } from '../lexicon'
import { maskContactDetails } from '../text/mask'
import { redactMoney } from '../text/money'
import type { ChatSettings, HandoffChannel, SiteKey } from '../types'
import type { HandoffTopic } from './schemas'

export type HandoffItem = {
  readonly title: string
  readonly ref: string | null
  readonly url: string
}

export type Handoff = {
  readonly channel: HandoffChannel
  readonly href: string
  readonly label: string
}

const URLISH =
  /\bhttps?:\/\/[^\s,;)]+|\bwww\.[^\s,;)]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s,;)]*)?/gi

/** The summary as it may travel: plain, no links, no contact details, at most 300 characters. */
export function cleanSummary(summary: string | undefined, site: SiteKey): string | null {
  if (summary === undefined) return null
  // Contact details first (an email address is also a domain), then anything link-like.
  let text = maskContactDetails(summary).text.replace(URLISH, '').replace(/[<>]/g, '')
  if (site === 'gallery') text = redactMoney(text)
  text = text.replace(/\s+/g, ' ').trim().slice(0, 300)
  return text === '' ? null : text
}

/** `+62 812-3456-7890` → `6281234567890`, or `null` unless it is E.164. */
export function waDigits(whatsapp: string | null): string | null {
  if (whatsapp === null) return null
  const digits = whatsapp.replace(/[\s().-]/g, '')
  return /^\+[1-9]\d{6,14}$/.test(digits) ? digits.slice(1) : null
}

function emailAddress(email: string | null): string | null {
  return email !== null && /^[^\s@<>?&#]+@[^\s@<>?&#]+\.[a-z]{2,}$/i.test(email) ? email : null
}

const TOPIC_KEYS = {
  item_enquiry: 'topic.item_enquiry',
  price: 'topic.price',
  authenticity: 'topic.authenticity',
  sell_to_us: 'topic.sell_to_us',
  partnership: 'topic.partnership',
  order: 'topic.order',
  delivery: 'topic.delivery',
  general: 'topic.general',
} as const

/** The message body, the same on both channels. */
function body(
  t: ChatCopy,
  topic: HandoffTopic,
  items: readonly HandoffItem[],
  summary: string | null,
): string {
  const lines = [t('handoff.greeting', { topic: t(TOPIC_KEYS[topic]) })]
  if (items.length > 0) {
    lines.push('', t('handoff.items'))
    for (const item of items) {
      lines.push(`- ${item.title}${item.ref ? ` (${item.ref})` : ''}`, `  ${item.url}`)
    }
  }
  if (summary !== null) lines.push('', t('handoff.summary', { summary }))
  return lines.join('\n')
}

/** Both channels the site has set up, `channel` first; none when settings name neither. */
export function buildHandoffs(input: {
  readonly site: SiteKey
  readonly settings: ChatSettings
  readonly t: ChatCopy
  readonly topic: HandoffTopic
  readonly items: readonly HandoffItem[]
  readonly summary: string | null
  readonly prefer?: HandoffChannel
}): readonly Handoff[] {
  const { settings, t, topic, items, summary } = input
  const text = body(t, topic, items, summary)
  const handoffs: Handoff[] = []
  const wa = waDigits(settings.contact.whatsapp)
  if (wa !== null) {
    handoffs.push({
      channel: 'whatsapp',
      href: `https://wa.me/${wa}?text=${encodeURIComponent(text)}`,
      label: t('handoff.whatsapp'),
    })
  }
  const email = emailAddress(settings.contact.email)
  if (email !== null) {
    const subject = t('handoff.subject', { topic: t(TOPIC_KEYS[topic]) })
    handoffs.push({
      channel: 'email',
      href: `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
      label: t('handoff.email'),
    })
  }
  const prefer = input.prefer ?? 'whatsapp'
  return handoffs.sort((a, b) => Number(b.channel === prefer) - Number(a.channel === prefer))
}
