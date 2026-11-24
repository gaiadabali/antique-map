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
import type { ChatSiteConfig } from '../sites/config'
import { maskContactDetails } from '../text/mask'
import { frameToolResult } from '../text/untrusted'
import type { ChatEvent, ChatSettings, SiteKey, SiteLocale } from '../types'
import { buildHandoffs, cleanSummary, type HandoffItem } from './handoff'
import type { ToolCall } from './validate'

export type ToolContext = {
  readonly site: SiteKey
  /** The site's configuration: its tools and the catalogue they read (`../sites`). */
  readonly config: ChatSiteConfig
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
  sister_site: 'status.sister',
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

/** The handoff lines for public item ids, looked up through the same published projections. */
export async function itemsFor(
  ids: readonly string[],
  ctx: Pick<ToolContext, 'config' | 'reader' | 'locale' | 't'>,
): Promise<HandoffItem[]> {
  const items: HandoffItem[] = []
  for (const id of ids) {
    const item = await ctx.config.catalogue.handoffItem(id, ctx)
    if (item) items.push(item)
  }
  return items
}

async function run(
  call: ToolCall,
  ctx: ToolContext,
): Promise<{ result: unknown; events: ChatEvent[] }> {
  const { site, locale, t, config } = ctx
  switch (call.name) {
    case 'search_catalogue':
      return config.catalogue.search(call, ctx)
    case 'get_item':
      return config.catalogue.get(call.id, ctx)
    case 'store_info':
      return {
        result: { stores: (await config.catalogue.stores?.(call.area, ctx)) ?? [] },
        events: [],
      }
    case 'delivery_info':
      return { result: config.catalogue.delivery(ctx), events: [] }
    case 'sister_site': {
      // The server's own card, its URL from config; none configured, no link (never a guess).
      const card = config.catalogue.sister?.(ctx) ?? null
      return card === null
        ? { result: { shown: false }, events: [] }
        : { result: { shown: true, title: card.title }, events: [{ type: 'card', ...card }] }
    }
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
