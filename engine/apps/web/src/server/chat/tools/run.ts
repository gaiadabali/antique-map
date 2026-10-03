/**
 * Running one validated tool call (AI.md §2.4): every tool is scoped to the request's site, reads
 * only published, projected data, and returns two things — the result the model reads (framed as
 * `<catalogue_data>`, size-capped) and the events the server streams itself (status lines, item
 * cards, handoff buttons, the lead form). Cards, links and the form are built from tool data,
 * never from model text.
 */
import 'server-only'

import { ConsentStore } from '../consent'
import { CHAT_LIMITS } from '../env'
import { CONSENT_VERSION, type ChatCopy } from '../lexicon'
import type { CatalogueReader } from '../ports'
import { getProduct, searchProducts } from '../projection/products'
import { deliveryInfo, findStores } from '../projection/stores'
import { getWork, searchWorks } from '../projection/works'
import { maskContactDetails } from '../text/mask'
import { frameToolResult } from '../text/untrusted'
import type { ChatCard, ChatEvent, ChatSettings, SiteKey, SiteLocale } from '../types'
import { buildHandoffs, cleanSummary, type HandoffItem } from './handoff'
import type { ToolCall } from './validate'

export type ToolContext = {
  readonly site: SiteKey
  readonly locale: SiteLocale
  readonly t: ChatCopy
  readonly reader: CatalogueReader
  readonly settings: ChatSettings
  readonly sessionId: string
  readonly consents: ConsentStore
  /** Records a `priceLabel` a tool returned: the shop's amount check then accepts that amount. */
  readonly notePrice: (label: string) => void
  /** Public item ids returned this turn, for the session record. */
  readonly itemIds: Set<string>
}

export type ToolOutcome = {
  /** What the model reads, already framed. */
  readonly content: string
  readonly isError: boolean
  readonly events: readonly ChatEvent[]
  readonly label: string
}

const STATUS = {
  search_catalogue: 'status.search',
  get_item: 'status.item',
  store_info: 'status.stores',
  delivery_info: 'status.delivery',
  handoff_link: 'status.handoff',
  create_lead: 'status.lead',
} as const

/** The result framed, cut down item by item until it fits the size cap. */
function framed(value: unknown): string {
  let text = frameToolResult(value)
  if (text.length <= CHAT_LIMITS.toolResultMaxChars) return text
  if (
    value !== null &&
    typeof value === 'object' &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    const results = [...(value as { results: unknown[] }).results]
    while (results.length > 1 && text.length > CHAT_LIMITS.toolResultMaxChars) {
      results.pop()
      text = frameToolResult({ ...(value as object), results, truncated: true })
    }
  }
  return text.length <= CHAT_LIMITS.toolResultMaxChars
    ? text
    : frameToolResult({ error: 'result too large' })
}

function card(kind: ChatCard['kind'], item: Omit<ChatCard, 'kind'>): ChatEvent {
  return { type: 'card', kind, ...item }
}

async function itemsFor(ids: readonly string[], ctx: ToolContext): Promise<HandoffItem[]> {
  const items: HandoffItem[] = []
  for (const id of ids) {
    if (ctx.site === 'gallery') {
      const work = await getWork(ctx.reader, id, ctx.locale, ctx.t)
      if (work) items.push({ title: work.title, ref: work.stockNumber, url: work.url })
    } else {
      const product = await getProduct(ctx.reader, id, ctx.locale, ctx.t)
      if (product) items.push({ title: product.title, ref: product.sku, url: product.url })
    }
  }
  return items
}

async function run(
  call: ToolCall,
  ctx: ToolContext,
): Promise<{ result: unknown; events: ChatEvent[] }> {
  const { site, locale, t, reader } = ctx
  switch (call.name) {
    case 'search_catalogue': {
      if (site === 'gallery') {
        const results = await searchWorks(
          reader,
          { query: call.query, filters: call.filters, limit: call.limit },
          locale,
          t,
        )
        results.forEach((work) => ctx.itemIds.add(work.id))
        return {
          result: { results },
          events: results.map((work) =>
            card('work', {
              id: work.id,
              title: work.title,
              url: work.url,
              image: work.image,
              ...(work.statusLabel ? { statusLabel: work.statusLabel } : {}),
            }),
          ),
        }
      }
      const results = await searchProducts(
        reader,
        { query: call.query, category: call.filters.category, limit: call.limit },
        locale,
        t,
      )
      results.forEach((product) => {
        ctx.itemIds.add(product.id)
        if (product.priceLabel) ctx.notePrice(product.priceLabel)
      })
      return {
        result: { results },
        events: results.map((p) =>
          card('product', {
            id: p.id,
            title: p.title,
            url: p.url,
            image: p.image,
            statusLabel: p.statusLabel,
            ...(p.priceLabel ? { priceLabel: p.priceLabel } : {}),
          }),
        ),
      }
    }
    case 'get_item': {
      if (site === 'gallery') {
        const work = await getWork(reader, call.id, locale, t)
        if (work === null) return { result: { found: false }, events: [] }
        ctx.itemIds.add(work.id)
        return {
          result: { found: true, item: work },
          events: [
            card('work', {
              id: work.id,
              title: work.title,
              url: work.url,
              image: work.image,
              ...(work.statusLabel ? { statusLabel: work.statusLabel } : {}),
            }),
          ],
        }
      }
      const product = await getProduct(reader, call.id, locale, t)
      if (product === null) return { result: { found: false }, events: [] }
      ctx.itemIds.add(product.id)
      for (const label of [product.priceLabel, ...product.variants.map((v) => v.priceLabel)]) {
        if (label) ctx.notePrice(label)
      }
      return {
        result: { found: true, item: product },
        events: [
          card('product', {
            id: product.id,
            title: product.title,
            url: product.url,
            image: product.image,
            statusLabel: product.statusLabel,
            ...(product.priceLabel ? { priceLabel: product.priceLabel } : {}),
          }),
        ],
      }
    }
    case 'store_info':
      return { result: { stores: await findStores(reader, call.area, locale) }, events: [] }
    case 'delivery_info':
      return { result: deliveryInfo(site, ctx.settings, locale, t), events: [] }
    case 'handoff_link': {
      const handoffs = buildHandoffs({
        site,
        settings: ctx.settings,
        t,
        topic: call.topic,
        items: await itemsFor(call.itemIds, ctx),
        summary: cleanSummary(call.summary, site),
        prefer: call.channel,
      })
      return {
        result: { shown: handoffs.length > 0, channels: handoffs.map((h) => h.channel) },
        events: handoffs.map((h) => ({ type: 'handoff', ...h })),
      }
    }
    case 'create_lead': {
      const summary = maskContactDetails(call.summary).text
      const token = ctx.consents.issue({
        sessionId: ctx.sessionId,
        site,
        locale,
        kind: call.kind,
        summary,
        itemIds: call.itemIds,
      })
      return {
        result: {
          status: 'needs_consent',
          note: 'The server is showing the visitor a contact form. Do not ask for contact details.',
        },
        events: [
          {
            type: 'lead_form',
            kind: call.kind,
            itemIds: call.itemIds,
            consentText: t('consent.text'),
            consentVersion: CONSENT_VERSION,
            consentToken: token,
          },
        ],
      }
    }
  }
}

/** Runs the call; a failure (a database error, a projection violation) runs nothing visible. */
export async function runTool(call: ToolCall, ctx: ToolContext): Promise<ToolOutcome> {
  const status: ChatEvent = { type: 'status', label: ctx.t(STATUS[call.name]) }
  try {
    const { result, events } = await run(call, ctx)
    return {
      content: framed(result),
      isError: false,
      events: [status, ...events],
      label: `tool:${call.name}`,
    }
  } catch (error) {
    // The tool's name and the error's class only: never its arguments or data.
    console.error(
      `[chat] tool ${call.name} failed: ${error instanceof Error ? error.name : 'error'}`,
    )
    return {
      content: framed({ error: 'unavailable' }),
      isError: true,
      events: [status],
      label: `tool_error:${call.name}`,
    }
  }
}
