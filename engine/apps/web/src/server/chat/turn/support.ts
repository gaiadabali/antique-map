/**
 * The pieces of a turn the server builds itself (AI.md §2.1 step 6): the history the model sees,
 * the amounts the shop may state, and the handoff cards and lead form the server adds whatever the
 * model chose to call. Cards and forms are built from tool data and settings, never model text.
 */
import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import type { ChatDeps } from '../context'
import { CONSENT_VERSION, type ChatCopy } from '../lexicon'
import { defuseVisitorText } from '../text/untrusted'
import { buildHandoffs } from '../tools/handoff'
import { itemsFor } from '../tools/run'
import type { HandoffTopic } from '../tools/schemas'
import type {
  ChatEvent,
  ChatSessionRecord,
  ChatSettings,
  ClassifierLabel,
  SiteKey,
  SiteLocale,
} from '../types'

export const LABEL_TOPICS: Partial<Record<ClassifierLabel, HandoffTopic>> = {
  authenticity_valuation: 'authenticity',
  sell_to_us: 'sell_to_us',
  partnership: 'partnership',
  order_status: 'order',
  price_request: 'price',
  delivery: 'delivery',
}

/** The history the model sees: the stored (masked) transcript as plain turns, append-only. */
export function historyOf(session: ChatSessionRecord): Anthropic.MessageParam[] {
  return session.transcript.map((entry) => ({
    role: entry.role,
    content: entry.role === 'user' ? defuseVisitorText(entry.text) : entry.text,
  }))
}

/** Amounts the shop may state: its settings and every price label tools returned this session. */
export function shopAmounts(session: ChatSessionRecord, settings: ChatSettings): Set<number> {
  const amounts = new Set<number>()
  for (const band of settings.delivery?.bands ?? []) amounts.add(band.feeIdr)
  if (settings.delivery?.freeOverIdr) amounts.add(settings.delivery.freeOverIdr)
  for (const label of session.labels) {
    if (label.startsWith('price:')) amounts.add(Number(label.slice(6)))
  }
  return amounts
}

export type ServerCardContext = {
  readonly deps: ChatDeps
  readonly site: SiteKey
  readonly locale: SiteLocale
  readonly settings: ChatSettings
  readonly t: ChatCopy
  readonly sessionId: string
  /** The item the chat was opened from, else the items carded this turn (at most three). */
  readonly itemIds: readonly string[]
}

/** The page's item, else what this turn showed: the item a server-built card carries. */
export function cardItemIds(viewingItemId: string | null, shown: ReadonlySet<string>): string[] {
  return viewingItemId !== null ? [viewingItemId] : [...shown].slice(0, 3)
}

/** The handoff buttons, with the item in the message; an item lookup failure drops only the item. */
export async function handoffEvents(
  ctx: ServerCardContext,
  topic: HandoffTopic,
): Promise<ChatEvent[]> {
  const items = await itemsFor(ctx.itemIds, {
    site: ctx.site,
    reader: ctx.deps.reader,
    locale: ctx.locale,
    t: ctx.t,
  }).catch(() => [])
  return buildHandoffs({
    site: ctx.site,
    settings: ctx.settings,
    t: ctx.t,
    topic,
    items,
    summary: null,
  }).map((handoff) => ({ type: 'handoff', ...handoff }))
}

/**
 * The consent form the server shows when the visitor typed contact details (AI.md §2.1 step 2):
 * the details were masked, so the form is the only way they reach the team. It creates nothing
 * until the visitor's consent click, exactly as `create_lead` does.
 */
export function leadFormEvent(ctx: ServerCardContext): ChatEvent {
  const kind = ctx.itemIds.length > 0 ? 'ask' : 'contact'
  const token = ctx.deps.consents.issue({
    sessionId: ctx.sessionId,
    site: ctx.site,
    locale: ctx.locale,
    kind,
    summary: 'Typed contact details into the chat (removed before the model).',
    itemIds: ctx.itemIds,
  })
  return {
    type: 'lead_form',
    kind,
    itemIds: [...ctx.itemIds],
    consentText: ctx.t('consent.text'),
    consentVersion: CONSENT_VERSION,
    consentToken: token,
  }
}
