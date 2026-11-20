/**
 * The gallery's chat (AI.md §2.3): a curator's voice, never a price, the published `works` as its
 * catalogue. The text is frozen — it is part of the cached prompt prefix.
 */
import 'server-only'

import { SITES } from '@engine/config/sites'

import { getWork, searchWorks, type WorkSummary } from '../projection/works'
import { deliveryInfo } from '../projection/stores'
import { GALLERY_TOOLS } from '../tools/schemas'
import type { ChatEvent } from '../types'
import type { ChatSiteConfig, SiteCatalogue } from './config'

const PERSONA = `You are the AI assistant of ${SITES.gallery.name}, a gallery of original antique maps, prints and photographs of the Indonesian archipelago, held in Singapore. Your voice is knowledgeable, calm and unhurried: a curator, not a salesman. Visitors enquire about items; the gallery replies personally on WhatsApp or by email.`

const RULES = `- Never state, estimate, hint at or invent a price, a value, a discount, a currency or any amount of money for any item. Every original is "price on request": when asked about price or value, say the gallery gives prices on request and offer the handoff (handoff_link, topic "price").
- Availability: only the status label a tool returned ("listed as available", "sold"). Never promise a hold, a reservation or that an item will stay available.
- Shipping is arranged and quoted by the gallery with the buyer once a purchase is agreed. Promise no dates, destinations or costs; use delivery_info for the wording.
- Never give an authentication, valuation, investment, conservation or legal opinion. Authenticity or value questions go to the team (handoff_link, topic "authenticity").`

/** A work's card: never a price label (a gallery card carries none). */
function workCard(work: WorkSummary): ChatEvent {
  return {
    type: 'card',
    kind: 'work',
    id: work.id,
    title: work.title,
    url: work.url,
    image: work.image,
    ...(work.statusLabel ? { statusLabel: work.statusLabel } : {}),
  }
}

const catalogue: SiteCatalogue = {
  async search(call, ctx) {
    const results = await searchWorks(
      ctx.reader,
      { query: call.query, filters: call.filters, limit: call.limit },
      ctx.locale,
      ctx.t,
    )
    results.forEach((work) => ctx.itemIds.add(work.id))
    return { result: { results }, events: results.map(workCard) }
  },
  async get(id, ctx) {
    const work = await getWork(ctx.reader, id, ctx.locale, ctx.t)
    if (work === null) return { result: { found: false }, events: [] }
    ctx.itemIds.add(work.id)
    return { result: { found: true, item: work }, events: [workCard(work)] }
  },
  async handoffItem(id, ctx) {
    const work = await getWork(ctx.reader, id, ctx.locale, ctx.t)
    return work ? { title: work.title, ref: work.stockNumber, url: work.url } : null
  },
  delivery: (ctx) => deliveryInfo('gallery', ctx.settings, ctx.locale, ctx.t),
}

export const galleryChat: ChatSiteConfig = {
  site: 'gallery',
  prompt: { persona: PERSONA, rules: RULES },
  tools: GALLERY_TOOLS,
  searchFilters: ['place', 'maker', 'period', 'objectType'],
  catalogue,
}
